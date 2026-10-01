import { Router } from 'express';
import { createDigitalMenu, deleteDigitalMenu, getDigitalMenus, getPublicMenu, getTableDrafts, submitPublicOrder } from '../controllers/digitalMenuController';
import { authorize, protect, requireScreenAccess } from '../middleware/auth';

const router = Router();
router.get('/public/:token', getPublicMenu);
router.post('/public/:token/order', submitPublicOrder);
router.use(protect, authorize('super_admin', 'admin', 'user'), requireScreenAccess('digital_menus'));
router.get('/', getDigitalMenus);
router.post('/', createDigitalMenu);
router.get('/table-drafts', getTableDrafts);
router.delete('/:id', deleteDigitalMenu);
export default router;
