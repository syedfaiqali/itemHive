import { Router } from 'express';
import { createOrderDraft, deleteOrderDraft, getOrderDraft, getOrderDrafts, updateOrderDraft } from '../controllers/orderDraftController';
import { authorize, protect, requireScreenAccess } from '../middleware/auth';

const router = Router();

router.use(protect, authorize('super_admin', 'admin', 'user'), requireScreenAccess('pos', 'orders'));
router.get('/', getOrderDrafts);
router.get('/:id', getOrderDraft);
router.post('/', createOrderDraft);
router.put('/:id', updateOrderDraft);
router.delete('/:id', deleteOrderDraft);

export default router;
