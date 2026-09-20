import { Response } from 'express';
import User from '../models/User';
import Business from '../models/Business';
import AppSetting from '../models/AppSetting';
import type { AuthRequest } from '../middleware/auth';
import { normalizeRole, serializeUser } from '../utils/accessControl';
import { isAdminScreenPermission } from '../utils/screenPermissions';
import { getAppSettingsForTenant, invalidateAppSettingsCache } from '../utils/tenancy';

const isMonthlyPaymentOverdue = (settings: any, now = new Date()) => {
    if (!settings?.monthlyPaymentTrackingEnabled) return false;
    const referenceDate = settings.monthlyPaymentPaidAt || settings.monthlyPaymentTrackingStartedAt;
    if (!referenceDate) return false;
    const dueDate = new Date(referenceDate);
    dueDate.setMonth(dueDate.getMonth() + 1);
    return dueDate <= now;
};

const ensureManageableTarget = (role: string) => {
    const normalizedRole = normalizeRole(role);

    if (normalizedRole === 'super_admin') {
        throw new Error('Super admin accounts cannot be changed from this endpoint');
    }
};

const ensureDeleteAllowed = (actor: AuthRequest['user'], target: any) => {
    ensureManageableTarget(target.role);

    if (String(target._id) === actor?.id) {
        throw new Error('You cannot delete your own account');
    }

    if (normalizeRole(actor?.role) === 'super_admin') {
        return;
    }

    if (normalizeRole(actor?.role) === 'admin') {
        const isOwnUser = normalizeRole(target.role) === 'user' && String(target.createdBy || '') === actor?.id;
        if (isOwnUser) {
            return;
        }
    }

    throw new Error('You are not allowed to delete this account');
};

const serializeUsersWithBusinessNames = async (users: any[]) => {
    const businessIds = [...new Set(users.map((user) => String(user.businessId || '')).filter(Boolean))];
    const [businesses, businessSettings] = await Promise.all([
        Business.find({ _id: { $in: businessIds } }).select('name'),
        AppSetting.find({
            $or: [
                { businessId: { $in: businessIds } },
                { key: { $in: businessIds.map((businessId) => `business:${businessId}`) } },
            ],
        }).select('key businessId restaurantEnabled monthlyPaymentTrackingEnabled monthlyPaymentPaidAt monthlyPaymentTrackingStartedAt'),
    ]);
    const businessNameById = new Map(businesses.map((business) => [String(business._id), business.name]));
    const restaurantEnabledByBusinessId = new Map<string, boolean>();
    const monthlyPaymentByBusinessId = new Map<string, { enabled: boolean; paidAt?: string; trackingStartedAt?: string; overdue: boolean }>();

    // Old legacy data may contain both a global settings record and the newer
    // business:<id> record. Read the global/legacy value first, then always
    // let the tenant-specific record win—the same precedence POS uses.
    const applyRestaurantSetting = (setting: any) => {
        const settingBusinessId = String(setting.key || '').startsWith('business:')
            ? String(setting.key).slice('business:'.length)
            : String(setting.businessId || '');
        if (settingBusinessId) {
            restaurantEnabledByBusinessId.set(settingBusinessId, Boolean(setting.restaurantEnabled));
            monthlyPaymentByBusinessId.set(settingBusinessId, {
                enabled: Boolean(setting.monthlyPaymentTrackingEnabled),
                paidAt: setting.monthlyPaymentPaidAt ? new Date(setting.monthlyPaymentPaidAt).toISOString() : undefined,
                trackingStartedAt: setting.monthlyPaymentTrackingStartedAt ? new Date(setting.monthlyPaymentTrackingStartedAt).toISOString() : undefined,
                overdue: isMonthlyPaymentOverdue(setting),
            });
        }
    };
    businessSettings.filter((setting) => !String(setting.key || '').startsWith('business:')).forEach(applyRestaurantSetting);
    businessSettings.filter((setting) => String(setting.key || '').startsWith('business:')).forEach(applyRestaurantSetting);

    return users.map((user) => ({
        ...serializeUser(user),
        businessName: businessNameById.get(String(user.businessId || '')) || '',
        restaurantEnabled: restaurantEnabledByBusinessId.get(String(user.businessId || '')) || false,
        monthlyPayment: monthlyPaymentByBusinessId.get(String(user.businessId || '')) || { enabled: false, overdue: false },
    }));
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
            .select('name email role isActive isVisible installmentAccess discountAccess screenPermissions userCreationLimit createdBy businessId preferences avatar +visiblePassword')
            .sort({ createdAt: -1 });

        if (!paginated) {
            const users = await usersQuery;
            return res.json(await serializeUsersWithBusinessNames(users));
        }

        const [users, total] = await Promise.all([
            usersQuery.skip((page - 1) * limit).limit(limit),
            User.countDocuments(query),
        ]);

        return res.json({
            users: await serializeUsersWithBusinessNames(users),
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

        const isRestaurantModeUpdate = typeof req.body.restaurantEnabled === 'boolean';
        // Restaurant mode belongs to a workspace. A super admin must be able
        // to configure it for the legacy workspace as well.
        if (!isRestaurantModeUpdate) {
            ensureManageableTarget(user.role);
        }

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

        if (typeof req.body.discountAccess === 'boolean') {
            if (normalizeRole(user.role) !== 'admin') {
                return res.status(400).json({ message: 'Discount access can only be assigned to admin accounts' });
            }
            user.discountAccess = req.body.discountAccess;
        }

        if (typeof req.body.restaurantEnabled === 'boolean') {
            if (!['admin', 'super_admin'].includes(normalizeRole(user.role)) || !user.businessId) {
                return res.status(400).json({ message: 'Restaurant mode can only be assigned to client admin accounts' });
            }

            // Use the same tenant-settings lookup that POS uses. In particular,
            // this migrates a legacy workspace's old global settings document to
            // its business key before updating it, so the Team grid and POS read
            // back the same value immediately.
            const business = await Business.findById(user.businessId).select('isLegacy');
            if (!business) {
                return res.status(400).json({ message: 'The account workspace could not be found' });
            }

            const tenant = {
                businessId: String(user.businessId),
                businessIsLegacy: Boolean(business.isLegacy),
            };
            const appSettings = await getAppSettingsForTenant(tenant);
            // Some older tenant records have the business key but no businessId.
            // Backfill it so Team Management reads the same setting that POS uses.
            if (!appSettings.businessId || String(appSettings.businessId) !== tenant.businessId) {
                appSettings.businessId = user.businessId;
            }
            appSettings.restaurantEnabled = req.body.restaurantEnabled;
            await appSettings.save();
            invalidateAppSettingsCache(tenant);
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

export const updateMonthlyPayment = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || !user.businessId || !['admin', 'super_admin'].includes(normalizeRole(user.role))) {
            return res.status(400).json({ message: 'Monthly payment can only be managed for an admin workspace' });
        }
        const business = await Business.findById(user.businessId).select('isLegacy');
        if (!business) return res.status(400).json({ message: 'The account workspace could not be found' });

        const tenant = { businessId: String(user.businessId), businessIsLegacy: Boolean(business.isLegacy) };
        const settings = await getAppSettingsForTenant(tenant);
        const enabled = Boolean(req.body.enabled);
        const paid = enabled && Boolean(req.body.paid);
        settings.monthlyPaymentTrackingEnabled = enabled;
        settings.monthlyPaymentTrackingStartedAt = enabled
            ? (settings.monthlyPaymentTrackingStartedAt || new Date())
            : undefined;
        settings.monthlyPaymentPaidAt = paid
            ? new Date(req.body.paidAt || new Date())
            : undefined;
        await settings.save();
        invalidateAppSettingsCache(tenant);
        return res.json({ message: 'Monthly payment updated successfully' });
    } catch (error: any) {
        return res.status(400).json({ message: error.message || 'Failed to update monthly payment' });
    }
};

export const getMonthlyPaymentAlerts = async (_req: AuthRequest, res: Response) => {
    try {
        const settings = await AppSetting.find({ monthlyPaymentTrackingEnabled: true })
            .select('businessId key monthlyPaymentPaidAt monthlyPaymentTrackingStartedAt');
        const businessIds = settings.flatMap((setting) => setting.businessId ? [setting.businessId] : []);
        const businesses = await Business.find({ _id: { $in: businessIds } }).select('name');
        const businessNames = new Map(businesses.map((business) => [String(business._id), business.name]));
        return res.json(settings.filter((setting) => isMonthlyPaymentOverdue(setting)).map((setting) => ({
            businessId: String(setting.businessId || ''),
            businessName: businessNames.get(String(setting.businessId || '')) || 'Workspace',
            paidAt: setting.monthlyPaymentPaidAt || null,
        })));
    } catch (error: any) {
        return res.status(500).json({ message: error.message || 'Failed to load monthly payment alerts' });
    }
};

export const getBusinesses = async (_req: AuthRequest, res: Response) => {
    try {
        const businesses = await Business.find({ isActive: true })
            .select('name slug isLegacy createdAt')
            .sort({ isLegacy: -1, name: 1 });

        const userCounts = await User.aggregate([
            { $match: { businessId: { $in: businesses.map((business) => business._id) } } },
            { $group: { _id: '$businessId', count: { $sum: 1 } } },
        ]);
        const userCountByBusiness = new Map(userCounts.map((entry) => [String(entry._id), entry.count]));

        return res.json(businesses.map((business) => ({
            id: String(business._id),
            name: business.name,
            slug: business.slug,
            isLegacy: business.isLegacy,
            userCount: userCountByBusiness.get(String(business._id)) || 0,
        })));
    } catch (error: any) {
        return res.status(500).json({ message: error.message || 'Failed to fetch businesses' });
    }
};

export const updateBusiness = async (req: AuthRequest, res: Response) => {
    try {
        const business = await Business.findById(req.params.id);

        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }
        if (business.isLegacy) {
            return res.status(400).json({ message: 'The default business cannot be renamed' });
        }

        business.name = String(req.body.name || '').trim();
        await business.save();

        return res.json({
            message: 'Business updated successfully',
            business: {
                id: String(business._id),
                name: business.name,
                slug: business.slug,
                isLegacy: business.isLegacy,
            },
        });
    } catch (error: any) {
        return res.status(400).json({ message: error.message || 'Failed to update business' });
    }
};

export const deleteBusiness = async (req: AuthRequest, res: Response) => {
    try {
        const business = await Business.findById(req.params.id);

        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }
        if (business.isLegacy) {
            return res.status(400).json({ message: 'The default business cannot be deleted' });
        }

        const superAdminExists = await User.exists({ businessId: business._id, role: 'super_admin' });
        if (superAdminExists) {
            return res.status(400).json({ message: 'A business with a super admin account cannot be deleted' });
        }

        const deletedUsers = await User.deleteMany({ businessId: business._id });
        await business.deleteOne();

        return res.json({
            message: 'Business and its related users deleted successfully',
            deletedUsers: deletedUsers.deletedCount,
        });
    } catch (error: any) {
        return res.status(400).json({ message: error.message || 'Failed to delete business' });
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
        if (typeof req.body.businessId === 'string') {
            const businessId = String(req.body.businessId || '').trim();
            if (businessId) {
                const business = await Business.findById(businessId);
                if (!business || !business.isActive) {
                    return res.status(400).json({ message: 'Selected business was not found or is inactive' });
                }
                user.businessId = business._id;
            }
        }
        if (req.body.role) {
            user.role = normalizeRole(req.body.role);
        }
        if (req.body.password) {
            user.password = String(req.body.password);
            user.visiblePassword = String(req.body.password);
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

export const deleteUser = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        ensureDeleteAllowed(req.user, user);

        await user.deleteOne();

        return res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
        return res.status(400).json({ message: error.message || 'Failed to delete user' });
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

export const getAdminPermissionAssignments = async (_req: AuthRequest, res: Response) => {
    try {
        const admins = await User.find({ role: 'admin' })
            .select('name email role isActive businessId screenPermissions')
            .sort({ name: 1, email: 1 });

        return res.json(await serializeUsersWithBusinessNames(admins));
    } catch (error: any) {
        return res.status(500).json({ message: error.message || 'Failed to load admin permission assignments' });
    }
};

export const updateAdminScreenPermissions = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'Admin user not found' });
        }
        if (normalizeRole(user.role) !== 'admin') {
            return res.status(400).json({ message: 'Screen permissions can only be assigned to Admin users' });
        }

        const screenPermissions = Array.from(new Set(req.body.screenPermissions))
            .filter(isAdminScreenPermission);
        user.screenPermissions = screenPermissions;
        await user.save();

        return res.json({
            message: 'Admin screen permissions updated successfully',
            user: serializeUser(user),
        });
    } catch (error: any) {
        return res.status(400).json({ message: error.message || 'Failed to update screen permissions' });
    }
};
