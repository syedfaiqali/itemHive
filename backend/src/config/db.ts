import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/itemhive';

        if (mongoURI.includes('<password>')) {
            throw new Error('Please configure your MONGODB_URI in the .env file with a valid password.');
        }

        const conn = await mongoose.connect(mongoURI);

        console.log(`📦 MongoDB Connected: ${conn.connection.host}`);
    } catch (err: any) {
        console.error(`❌ Error connecting to MongoDB: ${err.message}`);
        process.exit(1);
    }
};

export default connectDB;
