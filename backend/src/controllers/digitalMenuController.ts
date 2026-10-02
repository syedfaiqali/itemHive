import crypto from 'crypto';
import { Response } from 'express';
import DigitalMenu from '../models/DigitalMenu';
import Product from '../models/Product';
import OrderDraft from '../models/OrderDraft';
import User from '../models/User';
import type { AuthRequest } from '../middleware/auth';
import { isSuperAdminEmail, normalizeRole } from '../utils/accessControl';
import { buildTenantFilter, getTenantObjectId } from '../utils/tenancy';
import { allocateDealPrice } from '../utils/dealPricing';

const canUseMenus = (req: AuthRequest) => req.user?.role === 'super_admin' || req.user?.digitalMenuAccess !== 'none';
const canSendToPos = (req: AuthRequest) => req.user?.role === 'super_admin' || req.user?.digitalMenuAccess === 'pos';
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Menus created before this flag existed have no value saved. Preserve the
// intended super-admin behaviour for only those legacy menus; other accounts
// must still receive an explicit POS-level access assignment.
const isOrderingEnabled = async (menu: any) => {
    if (menu.orderingEnabled !== undefined) return menu.orderingEnabled !== false;
    if (!menu.createdBy) return false;

    const creator = await User.findById(menu.createdBy).select('role email').lean();
    return normalizeRole(creator?.role) === 'super_admin' || isSuperAdminEmail(creator?.email);
};

// The first version stored every table QR as a standalone menu. Convert those
// records into children of one reusable menu while preserving their tokens, so
// existing printed QR codes continue to work.
const normalizeLegacyTableMenus = async (req: AuthRequest) => {
    const tenantFilter = buildTenantFilter(req.user!);
    const records = await DigitalMenu.find({ ...tenantFilter, menuType: { $ne: 'deal' } }).sort({ createdAt: 1 });
    const modernRoots = records.filter(menu => !menu.sourceMenuId && !menu.tableName);
    const legacyTables = records.filter(menu => !menu.sourceMenuId && Boolean(menu.tableName));
    const signature = (menu: { name: string; productIds: string[] }) =>
        `${menu.name.trim().toLocaleLowerCase()}\u0000${[...menu.productIds].sort().join('\u0000')}`;
    const grouped = new Map<string, typeof legacyTables>();

    legacyTables.forEach(menu => {
        const key = signature(menu);
        grouped.set(key, [...(grouped.get(key) || []), menu]);
    });

    for (const [key, tableMenus] of grouped) {
        let root = modernRoots.find(menu => signature(menu) === key);
        if (!root) {
            const first = tableMenus[0];
            root = await DigitalMenu.create({
                name: first.name,
                tableName: '',
                menuType: 'menu',
                token: crypto.randomBytes(12).toString('hex'),
                productIds: first.productIds,
                isActive: first.isActive,
                orderingEnabled: first.orderingEnabled,
                createdBy: first.createdBy,
                businessId: first.businessId || getTenantObjectId(req.user!),
            });
            modernRoots.push(root);
        }
        await DigitalMenu.updateMany(
            { _id: { $in: tableMenus.map(menu => menu._id) } },
            { $set: { sourceMenuId: root._id, menuType: 'menu', name: root.name } },
        );
    }
};

export const getDigitalMenus = async (req: AuthRequest, res: Response) => {
    if (!canUseMenus(req)) return res.status(403).json({ message: 'Digital Menu access has not been enabled for this account' });
    await normalizeLegacyTableMenus(req);
    const menus = await DigitalMenu.find(buildTenantFilter(req.user!)).sort({ createdAt: -1 }).lean();
    return res.json(menus);
};

export const createDigitalMenu = async (req: AuthRequest, res: Response) => {
    if (!canUseMenus(req)) return res.status(403).json({ message: 'Digital Menu access has not been enabled for this account' });
    let name = String(req.body.name || '').trim();
    const tableName = String(req.body.tableName || '').trim();
    const menuType = req.body.menuType === 'deal' ? 'deal' : 'menu';
    const dealPrice = req.body.dealPrice;
    if (menuType === 'deal' && (typeof dealPrice !== 'number' || !Number.isFinite(dealPrice) || dealPrice < 0)) {
        return res.status(400).json({ message: 'Enter a valid combined deal price' });
    }
    const sourceMenuId = String(req.body.sourceMenuId || '').trim();
    let productIds: string[] = [...new Set<string>((Array.isArray(req.body.productIds) ? req.body.productIds : []).map((value: unknown) => String(value)).filter(Boolean))];
    let sourceMenu: any = null;
    if (menuType === 'deal' && !sourceMenuId) return res.status(400).json({ message: 'Choose the main menu for this deal' });
    // A workspace has one reusable main menu. Tables and deals attach to it.
    if (!sourceMenuId && menuType === 'menu') {
        const existingMenu = await DigitalMenu.exists({ ...buildTenantFilter(req.user!), menuType: 'menu', sourceMenuId: null });
        if (existingMenu) return res.status(409).json({ message: 'A main menu already exists. Add a deal or create a table QR from that menu.' });
    }
    if (sourceMenuId) {
        sourceMenu = await DigitalMenu.findOne({ _id: sourceMenuId, ...buildTenantFilter(req.user!), menuType: 'menu', sourceMenuId: null }).lean();
        if (!sourceMenu) return res.status(400).json({ message: 'The selected menu is unavailable' });
        // A table QR reuses the menu. A deal keeps its own name and items.
        if (req.body.menuType !== 'deal') {
            name = sourceMenu.name;
            productIds = sourceMenu.productIds;
        }
    }
    const isTableQr = Boolean(sourceMenuId && req.body.menuType !== 'deal');
    if (!name || !productIds.length || (isTableQr && !tableName)) return res.status(400).json({ message: 'A name, at least one item, and a table name for each QR are required' });
    if (isTableQr) {
        const tableAlreadyExists = await DigitalMenu.exists({ ...buildTenantFilter(req.user!), tableName: new RegExp(`^${escapeRegExp(tableName)}$`, 'i') });
        if (tableAlreadyExists) return res.status(409).json({ message: `Table name "${tableName}" already exists. Please use a different table name.` });
    }
    const menu = await DigitalMenu.create({
        name, tableName: isTableQr ? tableName : '', productIds, menuType, sourceMenuId: sourceMenu?._id || null,
        dealPrice: menuType === 'deal' ? Math.round(dealPrice * 100) / 100 : undefined,
        token: crypto.randomBytes(12).toString('hex'),
        orderingEnabled: req.user?.role === 'super_admin' || req.user?.digitalMenuAccess === 'pos',
        createdBy: req.user!.id,
        businessId: getTenantObjectId(req.user!),
    });
    return res.status(201).json(menu);
};

export const updateDigitalMenu = async (req: AuthRequest, res: Response) => {
    if (!canUseMenus(req)) return res.status(403).json({ message: 'Digital Menu access has not been enabled for this account' });
    const menu = await DigitalMenu.findOne({ _id: req.params.id, ...buildTenantFilter(req.user!), $or: [{ sourceMenuId: null, menuType: 'menu' }, { menuType: 'deal' }] });
    if (!menu) return res.status(404).json({ message: 'Digital Menu not found' });
    const name = String(req.body.name || '').trim();
    const productIds = [...new Set<string>((Array.isArray(req.body.productIds) ? req.body.productIds : []).map((value: unknown) => String(value)).filter(Boolean))];
    if (!name || !productIds.length) return res.status(400).json({ message: 'Menu name and at least one item are required' });
    if (menu.menuType === 'deal') {
        const price = req.body.dealPrice;
        if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) return res.status(400).json({ message: 'Enter a valid combined deal price' });
        menu.dealPrice = Math.round(price * 100) / 100;
    }
    menu.name = name;
    menu.productIds = productIds;
    await menu.save();
    // QR records reference this menu dynamically; keeping their title in sync
    // makes legacy/admin data consistent as well.
    await DigitalMenu.updateMany({ sourceMenuId: menu._id, businessId: menu.businessId, menuType: 'menu' }, { $set: { name } });
    return res.json(menu);
};

export const deleteDigitalMenu = async (req: AuthRequest, res: Response) => {
    if (!canUseMenus(req)) return res.status(403).json({ message: 'Digital Menu access has not been enabled for this account' });
    const menu = await DigitalMenu.findOneAndDelete({ _id: req.params.id, ...buildTenantFilter(req.user!) });
    if (!menu) return res.status(404).json({ message: 'Digital Menu not found' });
    // Removing a root menu must also remove its deals and table QR records;
    // otherwise those QR links would point to an unavailable menu.
    if (!menu.sourceMenuId && menu.menuType === 'menu') {
        await DigitalMenu.deleteMany({ sourceMenuId: menu._id, ...buildTenantFilter(req.user!) });
    }
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
    const rootMenu = menu.sourceMenuId
        ? await DigitalMenu.findOne({ _id: menu.sourceMenuId, businessId: menu.businessId, isActive: true }).lean()
        : menu;
    if (!rootMenu) return res.status(404).json({ message: 'This QR menu is unavailable' });
    const deals = await DigitalMenu.find({ sourceMenuId: rootMenu._id, businessId: menu.businessId, menuType: 'deal', isActive: true }).lean();
    const productIds = [...new Set([...rootMenu.productIds, ...deals.flatMap(deal => deal.productIds)])];
    const products = await Product.find({ id: { $in: productIds }, businessId: menu.businessId }).select('id name salePrice price imageUrl category').lean();
    const ordered = productIds.map((id) => products.find((product) => product.id === id)).filter(Boolean);
    return res.json({
        menu: { name: rootMenu.name, tableName: menu.tableName, token: menu.token, menuType: 'menu', productIds: rootMenu.productIds, orderingEnabled: await isOrderingEnabled(menu) },
        deals: deals.map((deal) => ({ id: String(deal._id), name: deal.name, productIds: deal.productIds, dealPrice: deal.dealPrice ?? deal.productIds.reduce((sum, id) => { const product = products.find(product => product.id === id); return sum + Number(product?.salePrice ?? product?.price ?? 0); }, 0) })),
        products: ordered,
    });
};

export const submitPublicOrder = async (req: AuthRequest, res: Response) => {
    const menu = await DigitalMenu.findOne({ token: req.params.token, isActive: true }).lean();
    if (!menu) return res.status(404).json({ message: 'This QR menu is unavailable' });
    if (!menu.tableName) return res.status(400).json({ message: 'Orders can only be placed through a table QR code' });
    if (!(await isOrderingEnabled(menu))) return res.status(403).json({ message: 'This menu is view-only. Please call a waiter to order.' });
    const requested = Array.isArray(req.body.items) ? req.body.items : [];
    const requestedDeals = Array.isArray(req.body.deals) ? req.body.deals : [];
    const quantities = new Map<string, number>();
    const rootMenu = menu.sourceMenuId ? await DigitalMenu.findOne({ _id: menu.sourceMenuId, businessId: menu.businessId, isActive: true }).lean() : menu;
    if (!rootMenu) return res.status(404).json({ message: 'This QR menu is unavailable' });
    const deals = await DigitalMenu.find({ sourceMenuId: rootMenu._id, businessId: menu.businessId, menuType: 'deal', isActive: true }).lean();
    const allowedProductIds = new Set(rootMenu.productIds);
    requested.forEach((item: any) => {
        const id = String(item.productId || ''); const quantity = Number(item.quantity);
        if (allowedProductIds.has(id) && Number.isInteger(quantity) && quantity > 0) quantities.set(id, quantity);
    });
    const dealQuantities = new Map<string, number>();
    for (const item of requestedDeals) {
        const id = String(item.dealId || '');
        const quantity = Number(item.quantity);
        if (!deals.some(deal => String(deal._id) === id) || !Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({ message: 'One or more selected deals are unavailable or have an invalid quantity' });
        }
        dealQuantities.set(id, (dealQuantities.get(id) || 0) + quantity);
    }
    if (!quantities.size && !dealQuantities.size) return res.status(400).json({ message: 'Choose at least one menu item or deal' });
    const selectedDeals = deals.filter(deal => dealQuantities.has(String(deal._id)));
    const productIds = [...new Set([...quantities.keys(), ...selectedDeals.flatMap(deal => deal.productIds)])];
    const products = await Product.find({ id: { $in: productIds }, businessId: menu.businessId }).select('id name salePrice price').lean();
    if (products.length !== productIds.length) return res.status(400).json({ message: 'One or more selected items are unavailable' });
    const newItems = products.filter(product => quantities.has(product.id)).map((product) => ({ productId: product.id, productName: product.name, quantity: quantities.get(product.id)!, unitPrice: Number(product.salePrice ?? product.price ?? 0) }));
    const mergeItem = (target: typeof newItems, item: typeof newItems[number]) => {
        const found = target.find(current => current.productId === item.productId);
        if (found) {
            const quantity = found.quantity + item.quantity;
            found.unitPrice = (found.unitPrice * found.quantity + item.unitPrice * item.quantity) / quantity;
            found.quantity = quantity;
        } else target.push(item);
    };
    selectedDeals.forEach(deal => {
        const components = deal.productIds.map(id => products.find(product => product.id === id)!);
        const weights = components.map(product => Number(product.salePrice ?? product.price ?? 0));
        // Legacy deals use their combined item price until staff set a deal price.
        const prices = allocateDealPrice(deal.dealPrice ?? weights.reduce((sum, price) => sum + price, 0), weights);
        components.forEach((product, index) => mergeItem(newItems, { productId: product.id, productName: product.name, quantity: dealQuantities.get(String(deal._id))!, unitPrice: prices[index] }));
    });
    const filter = { businessId: menu.businessId, digitalMenuTable: menu.tableName };
    const existing = await OrderDraft.findOne(filter);
    if (existing) {
        newItems.forEach(item => mergeItem(existing.items, item));
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
