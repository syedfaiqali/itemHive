import mongoose, { Document, Schema } from 'mongoose';

export interface IDigitalMenu extends Document {
    name: string;
    tableName?: string;
    menuType: 'menu' | 'deal';
    sourceMenuId?: mongoose.Types.ObjectId;
    token: string;
    productIds: string[];
    dealPrice?: number;
    isActive: boolean;
    orderingEnabled: boolean;
    createdBy?: mongoose.Types.ObjectId;
    businessId?: mongoose.Types.ObjectId;
}

const DigitalMenuSchema = new Schema<IDigitalMenu>({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    // Root menus and deals are reusable definitions. Only a QR/table record
    // needs a table name.
    tableName: { type: String, trim: true, maxlength: 50, default: '' },
    menuType: { type: String, enum: ['menu', 'deal'], default: 'menu', index: true },
    sourceMenuId: { type: Schema.Types.ObjectId, ref: 'DigitalMenu', default: null, index: true },
    token: { type: String, required: true, unique: true, index: true },
    productIds: [{ type: String, required: true, trim: true }],
    dealPrice: { type: Number, min: 0 },
    isActive: { type: Boolean, default: true },
    orderingEnabled: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', default: null, index: true },
}, { timestamps: true });

DigitalMenuSchema.index({ businessId: 1, tableName: 1 });
export default mongoose.model<IDigitalMenu>('DigitalMenu', DigitalMenuSchema);
