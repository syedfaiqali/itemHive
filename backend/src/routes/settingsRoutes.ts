import { Router } from 'express';
import { getPublicPricingSettings, getSettings, updateSettings } from '../controllers/settingsController';
import { protect, authorize, requireScreenAccess } from '../middleware/auth';
import { settingsSchema, validate } from '../middleware/validate';

const router = Router();

router.get('/public-pricing', getPublicPricingSettings);
router.get('/', protect, authorize('super_admin', 'admin', 'user'), getSettings);
router.put('/', protect, authorize('super_admin', 'admin', 'user'), requireScreenAccess('settings'), validate(settingsSchema), updateSettings);

export default router;
