import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployeeDocument extends Document {
    employeeId: mongoose.Types.ObjectId;
    title: string;
    fileName: string;
    mimeType: string;
    size: number;
    /** Base64 data URL. Kept out of the employee record so profile reads stay small. */
    data: string;
    uploadedBy?: mongoose.Types.ObjectId;
    businessId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const EmployeeDocumentSchema: Schema<IEmployeeDocument> = new Schema(
    {
        employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
        title: { type: String, required: true, trim: true },
        fileName: { type: String, required: true, trim: true },
        mimeType: { type: String, required: true, trim: true },
        size: { type: Number, required: true, min: 0 },
        data: { type: String, required: true, select: false },
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        businessId: { type: Schema.Types.ObjectId, ref: 'Business', default: null, index: true },
    },
    { timestamps: true }
);

EmployeeDocumentSchema.index({ businessId: 1, employeeId: 1, createdAt: -1 });

export default mongoose.model<IEmployeeDocument>('EmployeeDocument', EmployeeDocumentSchema);
