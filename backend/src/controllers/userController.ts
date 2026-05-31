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
        const baseQuery = actorRole === 'super_admin'
            ? {}
            : { createdBy: req.user?.id, role: 'user' };
        const search = String(req.query.search || '').trim();
        const requestedPage = Number(req.query.page || 1);
        const requestedLimit = Number(req.query.limit || 20);
        const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
        const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, Math.floor(requestedLimit))) : 20;
        const paginated = Boolean(req.query.page || req.query.limit || search);
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const query = search
            ? {
                ...baseQuery,
                $or: [
                    { name: { $regex: escapedSearch, $options: 'i' } },
                    { email: { $regex: escapedSearch, $options: 'i' } },
                    { role: { $regex: escapedSearch, $options: 'i' } },
                ],
            }
            : baseQuery;

        const usersQuery = User.find(query)
            .select('name email role isActive isVisible installmentAccess userCreationLimit createdBy businessId preferences avatar')
            .sort({ createdAt: -1 });

        if (!paginated) {
            const users = await usersQuery;
            return res.json(users.map(serializeUser));
        }

        const [users, total] = await Promise.all([
            usersQuery.skip((page - 1) * limit).limit(limit),
            User.countDocuments(query),
        ]);

        return res.json({
            users: users.map(serializeUser),
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
        });
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

        if (typeof req.body.installmentAccess === 'boolean') {
            if (!['admin', 'user'].includes(normalizeRole(user.role))) {
                return res.status(400).json({ message: 'Installment access can only be assigned to admin or user accounts' });
            }
            user.installmentAccess = req.body.installmentAccess;
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

export const updateUserAccount = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.params.id).select('+password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        ensureManageableTarget(user.role);

        const normalizedEmail = String(req.body.email || '').trim().toLowerCase();
        const duplicateEmail = await User.exists({ email: normalizedEmail, _id: { $ne: user._id } });
        if (duplicateEmail) {
            return res.status(400).json({ message: 'Email address is already assigned to another account' });
        }

        user.name = String(req.body.name || '').trim();
        user.email = normalizedEmail;
        if (req.body.password) {
            user.password = String(req.body.password);
        }
        await user.save();

        return res.json({
            message: 'Account details updated successfully',
            user: serializeUser(user),
        });
    } catch (error: any) {
        return res.status(400).json({ message: error.message || 'Failed to update account details' });
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
