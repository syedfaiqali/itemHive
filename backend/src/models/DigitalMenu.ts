import mongoose, { Document, Schema } from 'mongoose';

export interface IDigitalMenu extends Document {
    name: string;
    tableName: string;
    token: string;
    productIds: string[];
    isActive: boolean;
    orderingEnabled: boolean;
    createdBy?: mongoose.Types.ObjectId;
    businessId?: mongoose.Types.ObjectId;
}

const DigitalMenuSchema = new Schema<IDigitalMenu>({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    tableName: { type: String, required: true, trim: true, maxlength: 50 },
    token: { type: String, required: true, unique: true, index: true },
    productIds: [{ type: String, required: true, trim: true }],
    isActive: { type: Boolean, default: true },
    orderingEnabled: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', default: null, index: true },
}, { timestamps: true });

DigitalMenuSchema.index({ businessId: 1, tableName: 1 });
export default mongoose.model<IDigitalMenu>('DigitalMenu', DigitalMenuSchema);
