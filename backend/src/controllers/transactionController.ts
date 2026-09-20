import { Request, Response } from 'express';
import Transaction from '../models/Transaction';
import Product from '../models/Product';
import mongoose from 'mongoose';
import type { AuthRequest } from '../middleware/auth';
import { normalizeRole } from '../utils/accessControl';
import { buildTenantFilter, getCachedAppSettingsForTenant, getTenantObjectId } from '../utils/tenancy';
import POSShift from '../models/POSShift';

export const getTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const transactions = await Transaction.find(buildTenantFilter(req.user!)).sort({ timestamp: -1 }).lean();
        res.json(transactions);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createPOSCheckout = async (req: AuthRequest, res: Response) => {
    const session = await mongoose.startSession();
    const orderId = String(req.body.orderId || '').trim();

    try {
        if (!orderId) return res.status(400).json({ message: 'Order ID is required' });
        const existingLines = await Transaction.find({ orderId, source: 'pos', ...buildTenantFilter(req.user!) }).sort({ id: 1 }).lean();
        if (existingLines.length > 0) return res.status(200).json({ transactions: existingLines });

        const requestedItems = Array.isArray(req.body.items) ? req.body.items : [];
        if (requestedItems.length === 0) return res.status(400).json({ message: 'Add at least one product before payment' });
        if (requestedItems.length > 100) return res.status(400).json({ message: 'An order cannot contain more than 100 products' });

        let savedTransactions: any[] = [];
        await session.withTransaction(async () => {
            if (!mongoose.Types.ObjectId.isValid(String(req.body.shiftId || ''))) {
                throw new Error('Open a POS shift before taking payment');
            }
            const activeShift = await POSShift.findOneAndUpdate(
                { _id: req.body.shiftId, status: 'open', ...buildTenantFilter(req.user!) },
                { $inc: { activityVersion: 1 } },
                { new: true, session },
            );
            if (!activeShift) throw new Error('This POS shift is closed. Open a new shift before taking payment');

            const appSettings = await getCachedAppSettingsForTenant(req.user!);
            const actorRole = normalizeRole(req.user?.role);
            const requestedDiscountPercent = Number(req.body.discountPercent || 0);
            const allowedDiscountOptions = (appSettings?.discountOptions || []).map(Number);
            const discountPercent = appSettings?.discountsEnabled
                && Number.isFinite(requestedDiscountPercent)
                && allowedDiscountOptions.includes(requestedDiscountPercent)
                ? Math.min(100, Math.max(0, requestedDiscountPercent))
                : 0;
            const taxRate = Number(appSettings?.salesTaxRate || 0) / 100;
            const productIds = requestedItems.map((item: any) => String(item.productId || ''));
            if (new Set(productIds).size !== productIds.length) throw new Error('Duplicate products are not allowed in one checkout');
            const products = await Product.find({ id: { $in: productIds }, ...buildTenantFilter(req.user!) }).session(session);
            const productMap = new Map(products.map((product) => [product.id, product]));
            if (productMap.size !== productIds.length) throw new Error('One or more products no longer exist');

            const lineInputs = requestedItems.map((item: any) => {
                const productId = String(item.productId || '');
                const product = productMap.get(productId)!;
                const quantity = Number(item.quantity);
                if (!Number.isInteger(quantity) || quantity < 1) throw new Error(`Invalid quantity for ${product.name}`);
                if (product.stock < quantity) throw new Error(`Insufficient stock for ${product.name}`);
                const defaultPrice = Number(product.salePrice ?? product.price ?? 0);
                const requestedPrice = Number(item.unitPrice ?? defaultPrice);
                if (!Number.isFinite(requestedPrice) || requestedPrice < 0) throw new Error(`Invalid sale price for ${product.name}`);
                if (actorRole === 'user' && requestedPrice !== defaultPrice) throw new Error('Users are not allowed to change the sale price');
                const subtotal = requestedPrice * quantity;
                const discountAmount = subtotal * (discountPercent / 100);
                const taxAmount = subtotal * taxRate;
                return {
                    product,
                    quantity,
                    unitPrice: requestedPrice,
                    subtotal,
                    discountAmount,
                    taxAmount,
                    totalPrice: subtotal + taxAmount - discountAmount,
                };
            });

            const orderTotal = lineInputs.reduce((sum: number, line: { totalPrice: number }) => sum + line.totalPrice, 0);
            const paymentMethod = ['cash', 'card', 'credit'].includes(req.body.paymentMethod) ? req.body.paymentMethod : 'cash';
            const requestedPaidNow = paymentMethod === 'credit' ? Number(req.body.paidNow || 0) : orderTotal;
            const paidNow = Math.min(Math.max(Number.isFinite(requestedPaidNow) ? requestedPaidNow : 0, 0), orderTotal);
            const dueAmount = paymentMethod === 'credit' ? Math.max(orderTotal - paidNow, 0) : 0;
            if (paymentMethod === 'credit' && dueAmount <= 0) throw new Error('Use Cash or Card for full payment. Credit requires a due amount');
            const paidVia = paymentMethod === 'credit'
                ? (req.body.paidVia === 'card' ? 'card' : 'cash')
                : paymentMethod;
            const isRestaurantOrder = Boolean(appSettings?.restaurantEnabled);
            const requestedOrderType = String(req.body.orderType || '').trim();
            const allowedOrderTypes = (appSettings?.orderTypeOptions || []).map((option) => String(option || '').trim());
            if (isRestaurantOrder && !allowedOrderTypes.includes(requestedOrderType)) {
                throw new Error('Select a valid order type before taking payment');
            }

            const transactionDocuments = lineInputs.map((line: any, index: number) => ({
                id: `${orderId}-L${index + 1}`,
                orderId,
                source: 'pos',
                shiftId: activeShift._id,
                productId: line.product.id,
                productName: line.product.name,
                type: 'reduction',
                amount: line.quantity,
                subtotal: line.subtotal,
                discountPercent,
                discountAmount: line.discountAmount,
                taxAmount: line.taxAmount,
                totalPrice: line.totalPrice,
                userName: req.user?.name || 'Staff',
                paymentMethod,
                paidVia,
                paidNow: index === 0 ? paidNow : 0,
                dueAmount: index === 0 ? dueAmount : 0,
                customerName: paymentMethod === 'credit' ? String(req.body.customerName || '').trim() : '',
                customerCnic: paymentMethod === 'credit' ? String(req.body.customerCnic || '').trim() : '',
                orderType: isRestaurantOrder ? requestedOrderType : undefined,
                otherOrderType: isRestaurantOrder && requestedOrderType === 'other' ? String(req.body.otherOrderType || '').trim() : '',
                unitCost: Number(line.product.purchasePrice || 0),
                unitPrice: line.unitPrice,
                grossProfit: (line.subtotal - line.discountAmount) - (Number(line.product.purchasePrice || 0) * line.quantity),
                businessId: getTenantObjectId(req.user!),
            }));

            savedTransactions = await Transaction.insertMany(transactionDocuments, { session });
            for (const line of lineInputs) {
                line.product.stock -= line.quantity;
                await line.product.save({ session });
            }
        });

        return res.status(201).json({ transactions: savedTransactions });
    } catch (error: any) {
        if (error?.code === 11000 && orderId) {
            const existingLines = await Transaction.find({ orderId, source: 'pos', ...buildTenantFilter(req.user!) }).sort({ id: 1 }).lean();
            if (existingLines.length > 0) return res.status(200).json({ transactions: existingLines });
        }
        return res.status(400).json({ message: error.message || 'POS checkout could not be completed' });
    } finally {
        await session.endSession();
    }
};

export const createTransaction = async (req: AuthRequest, res: Response) => {
    const session = await mongoose.startSession();

    try {
        const alreadySaved = await Transaction.findOne({
            id: req.body.id,
            ...buildTenantFilter(req.user!),
        }).lean();
        if (alreadySaved) return res.status(200).json(alreadySaved);

        let savedTransaction: any;

        // withTransaction retries MongoDB transient write conflicts before it
        // returns an error. A manual start/commit transaction does not do this.
        await session.withTransaction(async () => {
        const {
            id,
            productId,
            type,
            amount,
            totalPrice,
            userName,
            productName,
            paymentMethod,
            paidVia,
            paidNow,
            dueAmount,
            customerName,
            customerCnic,
            orderType,
            otherOrderType,
            unitPrice,
            discountPercent,
            source,
            orderId,
            shiftId,
        } = req.body;

        let resolvedShiftId: mongoose.Types.ObjectId | undefined;
        if (source === 'pos') {
            if (!mongoose.Types.ObjectId.isValid(String(shiftId || ''))) {
                throw new Error('Open a POS shift before taking payment');
            }
            const activeShift = await POSShift.findOneAndUpdate(
                { _id: shiftId, status: 'open', ...buildTenantFilter(req.user!) },
                { $inc: { activityVersion: 1 } },
                { new: true, session },
            );
            if (!activeShift) throw new Error('This POS shift is closed. Open a new shift before taking payment');
            resolvedShiftId = activeShift._id;
        }

        const product = await Product.findOne({ id: productId, ...buildTenantFilter(req.user!) }).session(session);
        if (!product) {
            throw new Error('Product not found');
        }

        const actorRole = normalizeRole(req.user?.role);
        const resolvedUnitCost = product.purchasePrice ?? 0;
        const defaultUnitPrice = Number(product.salePrice ?? product.price ?? 0);
        const requestedUnitPrice = unitPrice != null ? Number(unitPrice) : defaultUnitPrice;

        if (actorRole === 'user' && requestedUnitPrice !== defaultUnitPrice) {
            throw new Error('Users are not allowed to change the sale price');
        }

        const resolvedUnitPrice = requestedUnitPrice;
        // Discount availability and all monetary totals are decided server-side so a
        // disabled discount cannot be submitted directly from the browser.
        // The explicit field identifies a POS checkout. Other stock/order flows
        // retain their existing totals and do not gain POS tax/discount handling.
        const isPosCheckout = type === 'reduction' && discountPercent != null;
        const appSettings = isPosCheckout ? await getCachedAppSettingsForTenant(req.user!) : null;
        const resolvedSubtotal = resolvedUnitPrice * amount;
        const requestedDiscountPercent = Number(discountPercent || 0);
        const allowedDiscountOptions = (appSettings?.discountOptions || []).map(Number);
        const resolvedDiscountPercent = appSettings?.discountsEnabled
            && Number.isFinite(requestedDiscountPercent)
            && allowedDiscountOptions.includes(requestedDiscountPercent)
            ? Math.min(100, Math.max(0, requestedDiscountPercent))
            : 0;
        const resolvedDiscountAmount = resolvedSubtotal * (resolvedDiscountPercent / 100);
        const resolvedTaxAmount = isPosCheckout ? resolvedSubtotal * (Number(appSettings?.salesTaxRate || 0) / 100) : 0;
        const resolvedTotalPrice = isPosCheckout
            ? resolvedSubtotal + resolvedTaxAmount - resolvedDiscountAmount
            : Number(totalPrice ?? resolvedSubtotal);
        const resolvedGrossProfit = type === 'reduction'
            ? (resolvedSubtotal - resolvedDiscountAmount) - (resolvedUnitCost * amount)
            : 0;
        const isRestaurantOrder = Boolean(appSettings?.restaurantEnabled);
        const requestedOrderType = String(orderType || '').trim();
        const allowedOrderTypes = (appSettings?.orderTypeOptions || []).map((option) => String(option || '').trim());
        if (isRestaurantOrder && requestedOrderType && !allowedOrderTypes.includes(requestedOrderType)) {
            throw new Error('Select a valid order type');
        }

        // 1. Record the transaction
        const transaction = new Transaction({
            id,
            productId,
            type,
            amount,
            totalPrice: resolvedTotalPrice,
            subtotal: resolvedSubtotal,
            discountPercent: resolvedDiscountPercent,
            discountAmount: resolvedDiscountAmount,
            taxAmount: resolvedTaxAmount,
            userName: req.user?.name || userName || 'Staff',
            productName,
            paymentMethod: paymentMethod || 'cash',
            paidVia,
            paidNow: paidNow || 0,
            dueAmount: dueAmount || 0,
            customerName,
            customerCnic,
            orderType: isRestaurantOrder ? requestedOrderType || undefined : undefined,
            otherOrderType: isRestaurantOrder && requestedOrderType === 'other' ? otherOrderType : undefined,
            unitCost: resolvedUnitCost,
            unitPrice: resolvedUnitPrice,
            grossProfit: resolvedGrossProfit,
            source: source === 'pos' ? 'pos' : undefined,
            orderId: source === 'pos' ? String(orderId || id) : '',
            shiftId: resolvedShiftId,
            businessId: getTenantObjectId(req.user!),
        });
        await transaction.save({ session });

        if (type === 'reduction') {
            if (product.stock < amount) {
                throw new Error('Insufficient stock');
            }
            product.stock -= amount;
        } else {
            product.stock += amount;
        }

        await product.save({ session });
        savedTransaction = transaction;
        });

        return res.status(201).json(savedTransaction);
    } catch (error: any) {
        // A UUID-based checkout ID makes this path extraordinarily rare. If a
        // browser retries the exact same checkout after a lost response, return
        // the original transaction instead of treating the sale as a failure.
        if (error?.code === 11000) {
            const existingTransaction = await Transaction.findOne({
                id: req.body.id,
                ...buildTenantFilter(req.user!),
            }).lean();

            if (existingTransaction) {
                return res.status(200).json(existingTransaction);
            }
        }
        res.status(400).json({ message: error.message });
    } finally {
        await session.endSession();
    }
};

/**
 * Removes a transaction and restores the inventory to the state it was in
 * before that transaction. This is intentionally atomic: an order must never
 * disappear while its stock adjustment remains (or vice versa).
 */
export const deleteTransaction = async (req: AuthRequest, res: Response) => {
    const session = await mongoose.startSession();

    try {
        let deletedTransaction: any;

        await session.withTransaction(async () => {
            const transaction = await Transaction.findOne({
                id: req.params.id,
                ...buildTenantFilter(req.user!),
            }).session(session);

            if (!transaction) {
                const error: any = new Error('Transaction not found');
                error.statusCode = 404;
                throw error;
            }

            if (transaction.shiftId) {
                const shift = await POSShift.findById(transaction.shiftId).session(session);
                if (shift?.status === 'closed') {
                    const error: any = new Error('Transactions included in a finalized Shift Closing Report cannot be deleted');
                    error.statusCode = 409;
                    throw error;
                }
            }

            const product = await Product.findOne({
                id: transaction.productId,
                ...buildTenantFilter(req.user!),
            }).session(session);

            if (!product) {
                const error: any = new Error('The linked product was not found, so this transaction cannot be reversed');
                error.statusCode = 409;
                throw error;
            }

            const stockChange = transaction.type === 'reduction'
                ? transaction.amount
                : -transaction.amount;

            if (product.stock + stockChange < 0) {
                const error: any = new Error('This transaction cannot be deleted because it would make the product stock negative');
                error.statusCode = 409;
                throw error;
            }

            product.stock += stockChange;
            await product.save({ session });
            await transaction.deleteOne({ session });
            deletedTransaction = transaction;
        });

        res.json({ message: 'Transaction deleted and inventory restored', transaction: deletedTransaction });
    } catch (error: any) {
        res.status(error.statusCode || 400).json({ message: error.message });
    } finally {
        await session.endSession();
    }
};
