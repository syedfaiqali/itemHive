import { Router } from 'express';
import { createInstallmentPlan, getInstallmentPlans, payInstallment } from '../controllers/installmentController';
import { protect, authorize } from '../middleware/auth';
import { installmentPaymentSchema, installmentPlanSchema, validate } from '../middleware/validate';

const router = Router();

router.get('/', protect, authorize('super_admin', 'admin', 'user'), getInstallmentPlans);
router.post('/', protect, authorize('super_admin', 'admin', 'user'), validate(installmentPlanSchema), createInstallmentPlan);
router.post('/:id/payments', protect, authorize('super_admin', 'admin', 'user'), validate(installmentPaymentSchema), payInstallment);

export default router;
