import { Request, Response } from 'express';
import Transaction from '../models/Transaction';
import Product from '../models/Product';
import mongoose from 'mongoose';
import type { AuthRequest } from '../middleware/auth';
import { normalizeRole } from '../utils/accessControl';
import { buildTenantFilter, getAppSettingsForTenant, getTenantObjectId } from '../utils/tenancy';

export const getTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const transactions = await Transaction.find(buildTenantFilter(req.user!)).sort({ timestamp: -1 });
        res.json(transactions);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createTransaction = async (req: AuthRequest, res: Response) => {
    const session = await mongoose.startSession();

    try {
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
        } = req.body;

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
        const appSettings = isPosCheckout ? await getAppSettingsForTenant(req.user!) : null;
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
            orderType,
            otherOrderType,
            unitCost: resolvedUnitCost,
            unitPrice: resolvedUnitPrice,
            grossProfit: resolvedGrossProfit,
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
        res.status(400).json({ message: error.message });
    } finally {
        await session.endSession();
    }
};
