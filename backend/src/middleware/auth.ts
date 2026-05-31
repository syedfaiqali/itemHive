import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import AppSetting from '../models/AppSetting';
import { normalizeRole } from '../utils/accessControl';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: string;
        email: string;
        name: string;
        isActive: boolean;
        isVisible: boolean;
        installmentAccess: boolean;
        userCreationLimit: number;
    };
}

const resolveToken = (req: AuthRequest) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    return token;
};

const attachUserFromToken = async (req: AuthRequest) => {
    const token = resolveToken(req);

    if (!token) {
        return false;
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id).select('name email role isActive isVisible installmentAccess userCreationLimit');

    if (!user) {
        throw new Error('Not authorized, user not found');
    }

    const normalizedRole = normalizeRole(user.role);
    req.user = {
        id: String(user._id),
        role: normalizedRole,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        isVisible: user.isVisible,
        installmentAccess: normalizedRole === 'super_admin' || Boolean(user.installmentAccess),
        userCreationLimit: user.userCreationLimit ?? 0,
    };

    return true;
};

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = resolveToken(req);

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        await attachUserFromToken(req);

        if (!req.user?.isActive) {
            return res.status(403).json({ message: 'Your account has been deactivated. Please contact the super admin.' });
        }

        next();
    } catch (error) {
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

export const optionalProtect = async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
        await attachUserFromToken(req);
    } catch {
        req.user = undefined;
    }

    next();
};

export const authorize = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Role ${req.user?.role} is not authorized` });
        }
        next();
    };
};

export const requireInstallmentAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role === 'super_admin') {
        next();
        return;
    }

    const appSettings = await AppSetting.findOne({ key: 'global' }).select('installmentsEnabled');
    if (!appSettings?.installmentsEnabled || !req.user?.installmentAccess) {
        return res.status(403).json({ message: 'Installment access has not been enabled for this account' });
    }

    next();
};
