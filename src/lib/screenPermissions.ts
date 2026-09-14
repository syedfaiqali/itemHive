import type { User } from '../features/auth/authSlice';

export const ADMIN_SCREEN_PERMISSIONS = [
    { key: 'dashboard', label: 'Dashboard', group: 'Overview' },
    { key: 'pos', label: 'POS Terminal', group: 'Sales' },
    { key: 'orders', label: 'Order Desk', group: 'Sales' },
    { key: 'transactions', label: 'Transactions', group: 'Sales' },
    { key: 'inventory', label: 'Inventory', group: 'Inventory' },
    { key: 'inventory_categories', label: 'Categories', group: 'Inventory' },
    { key: 'inventory_add', label: 'Add Product', group: 'Inventory' },
    { key: 'inventory_import', label: 'Import Products', group: 'Inventory' },
    { key: 'inventory_units', label: 'Product Units', group: 'Inventory' },
    { key: 'inventory_requests', label: 'Inventory Requests', group: 'Inventory' },
    { key: 'inventory_reduce', label: 'Reduce Stock', group: 'Inventory' },
    { key: 'customers', label: 'Customers', group: 'Customers & Credit' },
    { key: 'customer_records', label: 'Customer Records', group: 'Customers & Credit' },
    { key: 'credits', label: 'Credit Customers', group: 'Customers & Credit' },
    { key: 'installments', label: 'Installments', group: 'Customers & Credit' },
    { key: 'reports', label: 'Reports', group: 'Operations' },
    { key: 'notes', label: 'Sticky Notes', group: 'Operations' },
    { key: 'notifications', label: 'Notifications', group: 'Operations' },
    { key: 'team', label: 'Team Management', group: 'Administration' },
    { key: 'settings', label: 'Settings', group: 'Administration' },
] as const;

export type ScreenPermission = typeof ADMIN_SCREEN_PERMISSIONS[number]['key'];

export const ALL_ADMIN_SCREEN_KEYS = ADMIN_SCREEN_PERMISSIONS.map((permission) => permission.key);

export const hasScreenAccess = (user: User | null | undefined, permission: ScreenPermission) => {
    if (!user || user.role !== 'admin') return true;
    // null/undefined preserves full access for existing Admin accounts until
    // the Super Admin explicitly saves a permission assignment.
    return user.screenPermissions == null || user.screenPermissions.includes(permission);
};

