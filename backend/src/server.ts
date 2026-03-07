import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import transactionRoutes from './routes/transactionRoutes';
import reportRoutes from './routes/reportRoutes';
import { errorHandler, notFound } from './middleware/errorHandler';

// Environmental variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security & Parsing Middleware ────────────────────────────
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static Files ─────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Root & Health Routes ─────────────────────────────────────
app.get('/', (_req: Request, res: Response) => {
    res.json({
        status: 'success',
        message: 'ItemHive Pro API is online 🚀',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        endpoints: ['/api/auth', '/api/products', '/api/transactions', '/api/reports']
    });
});

app.get('/health', (_req: Request, res: Response) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
    res.status(200).json({
        status: 'healthy',
        database: dbStatus,
        timestamp: new Date().toISOString()
    });
});

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);

// ── 404 & Error Handling ──────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Database + Server Boot ────────────────────────────────────
const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`🚀 ItemHive Server running at http://localhost:${PORT}`);
            console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('❌ Server failed to start:', error);
        process.exit(1);
    }
};

startServer();
