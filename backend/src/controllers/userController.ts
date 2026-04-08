import { Response } from 'express';
import User from '../models/User';
import type { AuthRequest } from '../middleware/auth';
import { normalizeRole, serializeUser } from '../utils/accessControl';

const ensureManageableTarget = (role: string) => {
    const normalizedRole = normalizeRole(role);

    if (normalizedRole === 'super_admin') {
        throw new Error('Super admin accounts cannot be changed from this endpoint');
    }
};

export const getUsers = async (req: AuthRequest, res: Response) => {
    try {
        const actorRole = normalizeRole(req.user?.role);
        const query = actorRole === 'super_admin'
            ? {}
            : { createdBy: req.user?.id, role: 'user' };

        const users = await User.find(query)
            .select('name email role isActive isVisible userCreationLimit createdBy preferences avatar')
            .sort({ createdAt: -1 });

        return res.json(users.map(serializeUser));
    } catch (error: any) {
        return res.status(500).json({ message: error.message || 'Failed to fetch users' });
    }
};

export const updateUserStatus = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        ensureManageableTarget(user.role);

        if (typeof req.body.isActive === 'boolean') {
            user.isActive = req.body.isActive;
        }

        if (typeof req.body.isVisible === 'boolean') {
            user.isVisible = req.body.isVisible;
        }

        await user.save();

        return res.json({
            message: 'User status updated successfully',
            user: serializeUser(user),
        });
    } catch (error: any) {
        return res.status(400).json({ message: error.message || 'Failed to update user status' });
    }
};

export const updateUserCreationLimit = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        ensureManageableTarget(user.role);

        if (normalizeRole(user.role) !== 'admin') {
            return res.status(400).json({ message: 'User creation limits can only be assigned to admin accounts' });
        }

        user.userCreationLimit = Math.max(0, Number(req.body.userCreationLimit || 0));
        await user.save();

        return res.json({
            message: 'Admin user limit updated successfully',
            user: serializeUser(user),
        });
    } catch (error: any) {
        return res.status(400).json({ message: error.message || 'Failed to update admin limit' });
    }
};
