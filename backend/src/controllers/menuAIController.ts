import Joi from 'joi';
import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
import Product from '../models/Product';
import { buildTenantFilter } from '../utils/tenancy';
import { menuItemPrice, parseMenuPrices } from '../utils/menuPrices';
import { getGeminiKeys, GeminiQuotaError, GeminiRequestError } from '../services/geminiKeys';
import { suggestInventoryMenu } from '../services/inventoryMenuAI';

const schema = Joi.object({
    productIds: Joi.array().min(1).max(200).unique().items(Joi.string().max(200).required()).required(),
    menuName: Joi.string().max(100).allow('').default(''),
    brief: Joi.string().max(1000).allow('').default(''),
    includeDeals: Joi.boolean().default(false),
    existingSections: Joi.array().max(100).items(Joi.string().max(160).allow('')).default([]),
    productPrices: Joi.object().default({}),
});
const active = new Set<string>();

export async function recommendMenu(req: AuthRequest, res: Response) {
    if (req.user?.role !== 'super_admin' && req.user?.digitalMenuAccess === 'none') return res.status(403).json({ message: 'Digital Menu access has not been enabled for this account' });
    const { value, error } = schema.validate(req.body, { convert: false });
    if (error) return res.status(400).json({ message: 'Choose 1 to 200 inventory items and valid menu preferences.' });
    const prices = parseMenuPrices(value.productPrices, value.productIds);
    if (prices === null) return res.status(400).json({ message: 'Enter valid menu prices for your selected inventory.' });
    if (!getGeminiKeys().length) return res.status(503).json({ message: 'AI menu assistance is not configured yet. Ask your administrator to configure the Google AI key.' });
    const key = `${req.user!.businessId}:${req.user!.id}`;
    if (active.has(key)) return res.status(409).json({ message: 'Your menu is still being analyzed. Please wait for it to finish.' });
    active.add(key);
    try {
        // Only tenant-owned names, categories and retail prices are shared with AI.
        const products = await Product.find({ ...buildTenantFilter(req.user!), id: { $in: value.productIds } }).select('id name category salePrice price').lean();
        if (products.length !== value.productIds.length) return res.status(400).json({ message: 'Some selected inventory items are unavailable. Refresh your inventory and try again.' });
        const inventory = products.map(product => ({ id: product.id, name: product.name.slice(0, 250), category: String(product.category || '').slice(0, 160), price: menuItemPrice(product, prices) }));
        if (inventory.some(item => !Number.isFinite(item.price) || item.price < 0 || !Number.isFinite(item.price * 100))) return res.status(400).json({ message: 'Check the selling prices of the selected inventory items.' });
        return res.json(await suggestInventoryMenu(inventory, { menuName: value.menuName, brief: value.brief, includeDeals: value.includeDeals, existingSections: value.existingSections }));
    } catch (err) {
        if (err instanceof GeminiRequestError) {
            const messages = { connection: 'The server could not connect to Google AI. Please retry.', timeout: 'Google AI took too long to respond. Please retry.', model: 'The configured AI model is unavailable. Ask your administrator to update it.', credentials: 'Google AI rejected the configured credentials. Ask your administrator to check them.', provider: 'Google AI is experiencing high demand. Please try again shortly.' };
            return res.status(err.code === 'timeout' ? 504 : 503).json({ message: messages[err.code] });
        }
        if (err instanceof GeminiQuotaError) return res.status(503).json({ message: 'The AI service has reached its current quota. Please try again later.' });
        return res.status(502).json({ message: 'AI could not create valid menu suggestions. Your menu has not changed. Please try again.' });
    } finally { active.delete(key); }
}
