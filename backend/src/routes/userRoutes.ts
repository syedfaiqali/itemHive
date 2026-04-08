import { Router } from 'express';
import { getUsers, updateUserStatus, updateUserCreationLimit } from '../controllers/userController';
import { protect, authorize } from '../middleware/auth';
import { updateAdminLimitSchema, updateUserStatusSchema, validate } from '../middleware/validate';

const router = Router();

router.get('/', protect, authorize('super_admin', 'admin'), getUsers);
router.patch('/:id/status', protect, authorize('super_admin'), validate(updateUserStatusSchema), updateUserStatus);
router.patch('/:id/limit', protect, authorize('super_admin'), validate(updateAdminLimitSchema), updateUserCreationLimit);

export default router;
