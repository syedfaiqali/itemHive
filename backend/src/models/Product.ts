import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
    id: string;
    sku: string;
    name: string;
    category: string;
    purchasePrice: number;
    salePrice: number;
    price: number;
    stock: number;
    minStock: number;
    description: string;
    imageUrl?: string;
    lastUpdated: Date;
    batchNumber?: string;
    expiryDate?: string;
    supplier?: string;
}

const ProductSchema: Schema<IProduct> = new Schema({
    id: { type: String, required: true, unique: true, index: true },
    sku: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
    purchasePrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true },
    stock: { type: Number, required: true, default: 0 },
    minStock: { type: Number, required: true, default: 5 },
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    lastUpdated: { type: Date, default: Date.now },
    batchNumber: { type: String, default: '' },
    expiryDate: { type: String, default: '' },
    supplier: { type: String, default: '' }
}, { timestamps: true });

// Automatically update lastUpdated before saving
ProductSchema.pre('save', function () {
    this.price = this.salePrice;
    this.lastUpdated = new Date();
});

export default mongoose.model<IProduct>('Product', ProductSchema);
