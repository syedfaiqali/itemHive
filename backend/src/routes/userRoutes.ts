import { Router } from 'express';
import { deleteBusiness, deleteUser, getAdminPermissionAssignments, getBusinesses, getMonthlyPaymentAlerts, getUsers, updateAdminScreenPermissions, updateBusiness, updateMonthlyPayment, updateUserStatus, updateUserCreationLimit, updateUserAccount } from '../controllers/userController';
import { protect, authorize, requireScreenAccess } from '../middleware/auth';
import { updateAdminLimitSchema, updateBusinessSchema, updateMonthlyPaymentSchema, updateScreenPermissionsSchema, updateUserAccountSchema, updateUserStatusSchema, validate } from '../middleware/validate';

const router = Router();

router.get('/', protect, authorize('super_admin', 'admin'), requireScreenAccess('team'), getUsers);
router.get('/businesses', protect, authorize('super_admin'), getBusinesses);
router.get('/admin-permissions', protect, authorize('super_admin'), getAdminPermissionAssignments);
router.get('/monthly-payment-alerts', protect, getMonthlyPaymentAlerts);
router.patch('/businesses/:id', protect, authorize('super_admin'), validate(updateBusinessSchema), updateBusiness);
router.delete('/businesses/:id', protect, authorize('super_admin'), deleteBusiness);
router.patch('/:id/account', protect, authorize('super_admin'), validate(updateUserAccountSchema), updateUserAccount);
router.patch('/:id/status', protect, authorize('super_admin'), validate(updateUserStatusSchema), updateUserStatus);
router.patch('/:id/monthly-payment', protect, authorize('super_admin'), validate(updateMonthlyPaymentSchema), updateMonthlyPayment);
router.patch('/:id/limit', protect, authorize('super_admin'), validate(updateAdminLimitSchema), updateUserCreationLimit);
router.patch('/:id/permissions', protect, authorize('super_admin'), validate(updateScreenPermissionsSchema), updateAdminScreenPermissions);
router.delete('/:id', protect, authorize('super_admin', 'admin'), requireScreenAccess('team'), deleteUser);

export default router;
