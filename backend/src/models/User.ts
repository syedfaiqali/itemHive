import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    name: string;
    email: string;
    password?: string;
    role: 'admin' | 'cashier';
    avatar?: string;
    comparePassword: (password: string) => Promise<boolean>;
}

const UserSchema: Schema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, select: false },
    role: { type: String, enum: ['admin', 'cashier'], default: 'cashier' },
    avatar: { type: String },
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function (this: any) {
    if (!this.isModified('password') || !this.password) return;
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (err: any) {
        throw err;
    }
});

UserSchema.methods.comparePassword = async function (canditatePassword: string): Promise<boolean> {
    if (!this.password) return false;
    return bcrypt.compare(canditatePassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
