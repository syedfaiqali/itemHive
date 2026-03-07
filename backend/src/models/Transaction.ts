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
}

const TransactionSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    productId: { type: String, required: true, index: true },
    productName: { type: String, required: true },
    userName: { type: String, required: true },
    type: { type: String, enum: ['addition', 'reduction'], required: true, index: true },
    amount: { type: Number, required: true },
    totalPrice: { type: Number, required: true }
}, { timestamps: true });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
