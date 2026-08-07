import { Response } from 'express';
import User from '../models/User';
import type { AuthRequest } from '../middleware/auth';
import { normalizeRole } from '../utils/accessControl';
import type { IUser } from '../models/User';
import { getAppSettingsForTenant, getGlobalAppSettings } from '../utils/tenancy';
import type { IAppSetting } from '../models/AppSetting';

const serializeAppSettings = (appSettings: IAppSetting, globalAppSettings: IAppSetting) => ({
    salesTaxRate: appSettings.salesTaxRate,
    shopName: appSettings.shopName,
    shopPhone: appSettings.shopPhone,
    shopAddress: appSettings.shopAddress,
    receiptBannerUrl: appSettings.receiptBannerUrl || '',
    installmentsEnabled: appSettings.installmentsEnabled,
    autoRegistrationEnabled: globalAppSettings.autoRegistrationEnabled,
});

const serializePreferences = (preferences: IUser['preferences']) => ({
    country: preferences.country,
    currency: preferences.currency,
    notifications: {
        orderUpdates: preferences.notifications.orderUpdates,
        lowStockAlerts: preferences.notifications.lowStockAlerts,
    },
});

export const getSettings = async (req: AuthRequest, res: Response) => {
    try {
        const [user, appSettings, globalAppSettings] = await Promise.all([
            User.findById(req.user?.id).select('preferences'),
            getAppSettingsForTenant(req.user!),
            getGlobalAppSettings(),
        ]);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.json({
            ...serializePreferences(user.preferences),
            app: serializeAppSettings(appSettings, globalAppSettings),
        });
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

        const appSettings = await getAppSettingsForTenant(req.user!);
        const globalAppSettings = await getGlobalAppSettings();
        const role = normalizeRole(req.user?.role);
        const isSuperAdmin = role === 'super_admin';
        // Admins may brand their own workspace; the rest of the POS config is super-admin only.
        // Branding (banner, shop name, contact block) belongs to the workspace owner;
        // tax and installments stay with the super admin.
        const canEditBranding = isSuperAdmin || role === 'admin';

        if (req.body.app) {
            if (canEditBranding) {
                if (typeof req.body.app.receiptBannerUrl === 'string') {
                    appSettings.receiptBannerUrl = req.body.app.receiptBannerUrl;
                }
                appSettings.shopName = req.body.app.shopName;
                appSettings.shopPhone = req.body.app.shopPhone;
                appSettings.shopAddress = req.body.app.shopAddress;
            }
            if (isSuperAdmin) {
                appSettings.salesTaxRate = req.body.app.salesTaxRate;
                appSettings.installmentsEnabled = req.body.app.installmentsEnabled;
            }
            if (appSettings.isModified()) {
                await appSettings.save();
            }
            if (isSuperAdmin && typeof req.body.app.autoRegistrationEnabled === 'boolean') {
                globalAppSettings.autoRegistrationEnabled = req.body.app.autoRegistrationEnabled;
                await globalAppSettings.save();
            }
        }

        return res.json({
            ...serializePreferences(user.preferences),
            app: serializeAppSettings(appSettings, globalAppSettings),
        });
    } catch (error: any) {
        return res.status(400).json({ message: error.message || 'Failed to update settings' });
    }
};
