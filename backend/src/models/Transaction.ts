import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
    id: string;
    timestamp: Date;
    productId: string;
    productName: string;
    userName: string;
    type: 'addition' | 'reduction';
    amount: number;
    totalPrice: number;
    paymentMethod?: 'cash' | 'card' | 'credit' | 'installment';
    paidVia?: 'cash' | 'card';
    paidNow?: number;
    dueAmount?: number;
    customerName?: string;
    customerCnic?: string;
    unitCost?: number;
    unitPrice?: number;
    grossProfit?: number;
    installmentPlanId?: string;
}

const TransactionSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    productId: { type: String, required: true, index: true },
    productName: { type: String, required: true },
    userName: { type: String, required: true },
    type: { type: String, enum: ['addition', 'reduction'], required: true, index: true },
    amount: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['cash', 'card', 'credit', 'installment'], default: 'cash' },
    paidVia: { type: String, enum: ['cash', 'card'], default: undefined },
    paidNow: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    customerName: { type: String, default: '' },
    customerCnic: { type: String, default: '' },
    unitCost: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    grossProfit: { type: Number, default: 0 }
    ,
    installmentPlanId: { type: String, default: '', index: true }
}, { timestamps: true });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
