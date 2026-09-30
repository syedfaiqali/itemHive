import crypto from 'crypto';
import { Response } from 'express';
import DigitalMenu from '../models/DigitalMenu';
import Product from '../models/Product';
import OrderDraft from '../models/OrderDraft';
import User from '../models/User';
import type { AuthRequest } from '../middleware/auth';
import { buildTenantFilter, getTenantObjectId } from '../utils/tenancy';

const canUseMenus = (req: AuthRequest) => req.user?.role === 'super_admin' || req.user?.digitalMenuAccess !== 'none';
const canSendToPos = (req: AuthRequest) => req.user?.role === 'super_admin' || req.user?.digitalMenuAccess === 'pos';

export const getDigitalMenus = async (req: AuthRequest, res: Response) => {
    if (!canUseMenus(req)) return res.status(403).json({ message: 'Digital Menu access has not been enabled for this account' });
    const menus = await DigitalMenu.find(buildTenantFilter(req.user!)).sort({ createdAt: -1 }).lean();
    return res.json(menus);
};

export const createDigitalMenu = async (req: AuthRequest, res: Response) => {
    if (!canUseMenus(req)) return res.status(403).json({ message: 'Digital Menu access has not been enabled for this account' });
    const name = String(req.body.name || '').trim();
    const tableName = String(req.body.tableName || '').trim();
    const productIds: string[] = [...new Set<string>((Array.isArray(req.body.productIds) ? req.body.productIds : []).map((value: unknown) => String(value)).filter(Boolean))];
    if (!name || !tableName || !productIds.length) return res.status(400).json({ message: 'Name, table number, and at least one item are required' });
    const menu = await DigitalMenu.create({
        name, tableName, productIds,
        token: crypto.randomBytes(12).toString('hex'),
        orderingEnabled: req.user?.role === 'super_admin' || req.user?.digitalMenuAccess === 'pos',
        createdBy: req.user!.id,
        businessId: getTenantObjectId(req.user!),
    });
    return res.status(201).json(menu);
};

export const deleteDigitalMenu = async (req: AuthRequest, res: Response) => {
    if (!canUseMenus(req)) return res.status(403).json({ message: 'Digital Menu access has not been enabled for this account' });
    const menu = await DigitalMenu.findOneAndDelete({ _id: req.params.id, ...buildTenantFilter(req.user!) });
    if (!menu) return res.status(404).json({ message: 'Digital Menu not found' });
    return res.json({ message: 'Digital Menu removed' });
};

export const getTableDrafts = async (req: AuthRequest, res: Response) => {
    if (!canUseMenus(req)) return res.status(403).json({ message: 'Digital Menu access has not been enabled for this account' });
    const drafts = await OrderDraft.find({ ...buildTenantFilter(req.user!), digitalMenuTable: { $exists: true, $ne: '' } }).sort({ updatedAt: -1 }).lean();
    return res.json(drafts);
};

export const getPublicMenu = async (req: AuthRequest, res: Response) => {
    const menu = await DigitalMenu.findOne({ token: req.params.token, isActive: true }).lean();
    if (!menu) return res.status(404).json({ message: 'This QR menu is unavailable' });
    const products = await Product.find({ id: { $in: menu.productIds }, businessId: menu.businessId }).select('id name salePrice price imageUrl category').lean();
    const ordered = menu.productIds.map((id) => products.find((product) => product.id === id)).filter(Boolean);
    // Older QR records predate this flag. Keep them safely view-only instead
    // of exposing an order button until a POS-enabled user creates a new QR.
    return res.json({ menu: { name: menu.name, tableName: menu.tableName, token: menu.token, orderingEnabled: Boolean(menu.orderingEnabled) }, products: ordered });
};

export const submitPublicOrder = async (req: AuthRequest, res: Response) => {
    const menu = await DigitalMenu.findOne({ token: req.params.token, isActive: true }).lean();
    if (!menu) return res.status(404).json({ message: 'This QR menu is unavailable' });
    if (!menu.orderingEnabled) return res.status(403).json({ message: 'This menu is view-only. Please call a waiter to order.' });
    const requested = Array.isArray(req.body.items) ? req.body.items : [];
    const quantities = new Map<string, number>();
    requested.forEach((item: any) => {
        const id = String(item.productId || ''); const quantity = Number(item.quantity);
        if (menu.productIds.includes(id) && Number.isInteger(quantity) && quantity > 0) quantities.set(id, quantity);
    });
    if (!quantities.size) return res.status(400).json({ message: 'Choose at least one menu item' });
    const productIds = [...quantities.keys()];
    const products = await Product.find({ id: { $in: productIds }, businessId: menu.businessId }).select('id name salePrice price').lean();
    if (products.length !== productIds.length) return res.status(400).json({ message: 'One or more selected items are unavailable' });
    const newItems = products.map((product) => ({ productId: product.id, productName: product.name, quantity: quantities.get(product.id)!, unitPrice: Number(product.salePrice ?? product.price ?? 0) }));
    const filter = { businessId: menu.businessId, digitalMenuTable: menu.tableName };
    const existing = await OrderDraft.findOne(filter);
    if (existing) {
        newItems.forEach((item) => { const found = existing.items.find((current) => current.productId === item.productId); if (found) found.quantity += item.quantity; else existing.items.push(item); });
        await existing.save();
        return res.json({ message: 'Added to the existing table order', draft: existing });
    }
    // Drafts retain a valid staff owner for existing POS/history tooling, while
    // the display name makes it clear the selection came from a customer QR.
    const owner = await User.findOne({ businessId: menu.businessId }).select('_id').lean();
    if (!owner) return res.status(400).json({ message: 'This menu workspace has no staff account' });
    const draft = await OrderDraft.create({ draftCode: `TB-${Date.now().toString(36).toUpperCase()}`, items: newItems, discountPercent: 0, orderType: 'dine_in', digitalMenuTable: menu.tableName, createdByName: 'QR Customer', createdBy: owner._id, businessId: menu.businessId });
    return res.status(201).json({ message: 'Order sent to the table draft', draft });
};

export const requireDigitalPosAccess = (req: AuthRequest, res: Response) => {
    if (!canSendToPos(req)) return res.status(403).json({ message: 'Your Digital Menu access is menu-only. Ask the super admin to enable Add to POS.' });
    return res.status(204).end();
};
