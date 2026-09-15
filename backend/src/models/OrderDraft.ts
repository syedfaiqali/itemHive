import mongoose, { Document, Schema } from 'mongoose';

export interface IOrderDraftItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
}

export interface IOrderDraft extends Document {
    draftCode: string;
    items: IOrderDraftItem[];
    discountPercent: number;
    orderType?: 'dine_in' | 'takeaway' | 'foodpanda' | 'other';
    otherOrderType?: string;
    deliveryNumber?: string;
    createdBy: mongoose.Types.ObjectId;
    createdByName: string;
    businessId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const OrderDraftSchema = new Schema<IOrderDraft>({
    draftCode: { type: String, required: true, trim: true },
    items: [{
        productId: { type: String, required: true, trim: true },
        productName: { type: String, required: true, trim: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        _id: false,
    }],
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    orderType: { type: String, enum: ['dine_in', 'takeaway', 'foodpanda', 'other'], default: undefined },
    otherOrderType: { type: String, default: '', trim: true, maxlength: 80 },
    deliveryNumber: { type: String, default: '', trim: true, maxlength: 40 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdByName: { type: String, required: true, trim: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', default: null, index: true },
}, { timestamps: true });

OrderDraftSchema.index({ businessId: 1, draftCode: 1 }, { unique: true });
OrderDraftSchema.index({ businessId: 1, updatedAt: -1 });

export default mongoose.model<IOrderDraft>('OrderDraft', OrderDraftSchema);
