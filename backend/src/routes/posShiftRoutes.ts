import { Router } from 'express';
import { closeShift, getCurrentShift, getShiftHistory, getXReport, openShift } from '../controllers/posShiftController';
import { authorize, protect, requireScreenAccess } from '../middleware/auth';

const router = Router();

router.use(protect, authorize('super_admin', 'admin', 'user'), requireScreenAccess('pos'));
router.get('/current', getCurrentShift);
router.post('/open', openShift);
router.get('/x-report', getXReport);
router.post('/close', closeShift);
router.get('/history', getShiftHistory);

export default router;
