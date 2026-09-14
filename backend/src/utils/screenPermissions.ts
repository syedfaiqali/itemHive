export const ADMIN_SCREEN_PERMISSIONS = [
    'dashboard',
    'pos',
    'inventory',
    'inventory_categories',
    'inventory_add',
    'inventory_import',
    'inventory_units',
    'inventory_requests',
    'inventory_reduce',
    'orders',
    'transactions',
    'customers',
    'customer_records',
    'credits',
    'installments',
    'reports',
    'notes',
    'notifications',
    'team',
    'settings',
] as const;

export type AdminScreenPermission = typeof ADMIN_SCREEN_PERMISSIONS[number];

export const isAdminScreenPermission = (value: unknown): value is AdminScreenPermission =>
    typeof value === 'string' && ADMIN_SCREEN_PERMISSIONS.includes(value as AdminScreenPermission);

