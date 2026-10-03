import mongoose, { Schema, Document } from 'mongoose';

/** Custom designations a business adds on top of DEFAULT_DESIGNATIONS. */
export interface IDesignation extends Document {
    name: string;
    normalizedName: string;
    createdBy?: mongoose.Types.ObjectId;
    businessId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export const DEFAULT_DESIGNATIONS = [
    'Manager',
    'Assistant Manager',
    'Supervisor',
    'Accountant',
    'Cashier',
    'Salesman',
    'Store Keeper',
    'Chef',
    'Waiter',
    'Delivery Rider',
    'Helper',
    'Security Guard',
    'Cleaner',
];

export const normalizeDesignation = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

const DesignationSchema: Schema<IDesignation> = new Schema(
    {
        name: { type: String, required: true, trim: true },
        normalizedName: { type: String, required: true, trim: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        businessId: { type: Schema.Types.ObjectId, ref: 'Business', default: null, index: true },
    },
    { timestamps: true }
);

DesignationSchema.index({ businessId: 1, normalizedName: 1 }, { unique: true });

export default mongoose.model<IDesignation>('Designation', DesignationSchema);
