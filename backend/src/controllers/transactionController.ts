import { Request, Response } from 'express';
import Transaction from '../models/Transaction';
import Product from '../models/Product';
import mongoose from 'mongoose';

export const getTransactions = async (req: Request, res: Response) => {
    try {
        const transactions = await Transaction.find().sort({ timestamp: -1 });
        res.json(transactions);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createTransaction = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
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
            unitPrice,
        } = req.body;

        const product = await Product.findOne({ id: productId }).session(session);
        if (!product) {
            throw new Error('Product not found');
        }

        const resolvedUnitCost = product.purchasePrice ?? 0;
        const resolvedUnitPrice = unitPrice ?? product.salePrice ?? product.price ?? 0;
        const resolvedTotalPrice = totalPrice ?? (resolvedUnitPrice * amount);
        const resolvedGrossProfit = type === 'reduction'
            ? (resolvedUnitPrice - resolvedUnitCost) * amount
            : 0;

        // 1. Record the transaction
        const transaction = new Transaction({
            id,
            productId,
            type,
            amount,
            totalPrice: resolvedTotalPrice,
            userName,
            productName,
            paymentMethod: paymentMethod || 'cash',
            paidVia,
            paidNow: paidNow || 0,
            dueAmount: dueAmount || 0,
            customerName,
            customerCnic,
            unitCost: resolvedUnitCost,
            unitPrice: resolvedUnitPrice,
            grossProfit: resolvedGrossProfit,
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

        await session.commitTransaction();
        session.endSession();

        res.status(201).json(transaction);
    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ message: error.message });
    }
};
