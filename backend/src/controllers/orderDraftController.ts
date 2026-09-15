import { Response } from 'express';
import Product from '../models/Product';
import OrderDraft from '../models/OrderDraft';
import type { AuthRequest } from '../middleware/auth';
import { normalizeRole } from '../utils/accessControl';
import { buildTenantFilter, getCachedAppSettingsForTenant, getTenantObjectId } from '../utils/tenancy';

type DraftItemInput = {
    productId?: unknown;
    quantity?: unknown;
    unitPrice?: unknown;
};

const buildDraftPayload = async (req: AuthRequest) => {
    const requestedItems = Array.isArray(req.body.items) ? req.body.items as DraftItemInput[] : [];
    if (requestedItems.length === 0) throw new Error('Add at least one product before saving a draft');
    if (requestedItems.length > 100) throw new Error('A draft cannot contain more than 100 products');

    const normalizedItems = requestedItems.map((item) => ({
        productId: String(item.productId || '').trim(),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
    }));

    if (normalizedItems.some((item) => !item.productId || !Number.isInteger(item.quantity) || item.quantity < 1)) {
        throw new Error('Every draft product must have a valid quantity');
    }

    const productIds = Array.from(new Set(normalizedItems.map((item) => item.productId)));
    if (productIds.length !== normalizedItems.length) throw new Error('Duplicate products are not allowed in a draft');

    const products = await Product.find({
        id: { $in: productIds },
        ...buildTenantFilter(req.user!),
    }).lean();
    const productsById = new Map(products.map((product) => [product.id, product]));
    if (productsById.size !== productIds.length) throw new Error('One or more draft products no longer exist');

    const actorRole = normalizeRole(req.user?.role);
    const items = normalizedItems.map((item) => {
        const product = productsById.get(item.productId)!;
        const currentPrice = Number(product.salePrice ?? product.price ?? 0);
        const requestedPrice = Number.isFinite(item.unitPrice) && item.unitPrice >= 0 ? item.unitPrice : currentPrice;
        return {
            productId: item.productId,
            productName: product.name,
            quantity: item.quantity,
            unitPrice: actorRole === 'user' ? currentPrice : requestedPrice,
        };
    });

    const requestedDiscount = Number(req.body.discountPercent || 0);
    const appSettings = await getCachedAppSettingsForTenant(req.user!);
    const allowedDiscountOptions = (appSettings?.discountOptions || []).map(Number);
    const discountPercent = appSettings?.discountsEnabled
        && Number.isFinite(requestedDiscount)
        && allowedDiscountOptions.includes(requestedDiscount)
        ? Math.min(100, Math.max(0, requestedDiscount))
        : 0;
    const orderType = ['dine_in', 'takeaway', 'foodpanda', 'other'].includes(req.body.orderType)
        ? req.body.orderType
        : undefined;

    return {
        items,
        discountPercent,
        orderType,
        otherOrderType: orderType === 'other' ? String(req.body.otherOrderType || '').trim() : '',
        deliveryNumber: String(req.body.deliveryNumber || '').trim(),
    };
};

export const getOrderDrafts = async (req: AuthRequest, res: Response) => {
    try {
        const drafts = await OrderDraft.find(buildTenantFilter(req.user!)).sort({ updatedAt: -1 }).lean();
        return res.json(drafts);
    } catch (error: any) {
        return res.status(500).json({ message: error.message || 'Failed to fetch order drafts' });
    }
};

export const getOrderDraft = async (req: AuthRequest, res: Response) => {
    try {
        const draft = await OrderDraft.findOne({ _id: req.params.id, ...buildTenantFilter(req.user!) }).lean();
        if (!draft) return res.status(404).json({ message: 'Order draft not found' });
        return res.json(draft);
    } catch (error: any) {
        return res.status(400).json({ message: error.message || 'Failed to fetch order draft' });
    }
};

export const createOrderDraft = async (req: AuthRequest, res: Response) => {
    try {
        const payload = await buildDraftPayload(req);
        const draft = await OrderDraft.create({
            ...payload,
            draftCode: `DR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
            createdBy: req.user!.id,
            createdByName: req.user!.name || 'Staff',
            businessId: getTenantObjectId(req.user!),
        });
        return res.status(201).json(draft);
    } catch (error: any) {
        return res.status(400).json({ message: error.message || 'Failed to save order draft' });
    }
};

export const updateOrderDraft = async (req: AuthRequest, res: Response) => {
    try {
        const draft = await OrderDraft.findOne({ _id: req.params.id, ...buildTenantFilter(req.user!) });
        if (!draft) return res.status(404).json({ message: 'Order draft not found' });

        const payload = await buildDraftPayload(req);
        draft.set(payload);
        await draft.save();
        return res.json(draft);
    } catch (error: any) {
        return res.status(400).json({ message: error.message || 'Failed to update order draft' });
    }
};

export const deleteOrderDraft = async (req: AuthRequest, res: Response) => {
    try {
        const draft = await OrderDraft.findOneAndDelete({ _id: req.params.id, ...buildTenantFilter(req.user!) });
        if (!draft) return res.status(404).json({ message: 'Order draft not found' });
        return res.json({ message: 'Order draft removed' });
    } catch (error: any) {
        return res.status(400).json({ message: error.message || 'Failed to remove order draft' });
    }
};
