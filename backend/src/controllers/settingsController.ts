import { Response } from 'express';
import User from '../models/User';
import type { AuthRequest } from '../middleware/auth';

export const getSettings = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user?.id).select('preferences');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.json(user.preferences);
    } catch (error: any) {
        return res.status(500).json({ message: error.message || 'Failed to fetch settings' });
    }
};

export const updateSettings = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user?.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.preferences = {
            country: req.body.country,
            currency: req.body.currency,
            notifications: {
                orderUpdates: req.body.notifications.orderUpdates,
                lowStockAlerts: req.body.notifications.lowStockAlerts,
            },
        };

        await user.save();
        return res.json(user.preferences);
    } catch (error: any) {
        return res.status(400).json({ message: error.message || 'Failed to update settings' });
    }
};
