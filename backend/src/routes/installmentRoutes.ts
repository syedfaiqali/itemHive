import { Router } from 'express';
import { createInstallmentPlan, getInstallmentPlans, payInstallment } from '../controllers/installmentController';
import { protect, authorize } from '../middleware/auth';
import { installmentPaymentSchema, installmentPlanSchema, validate } from '../middleware/validate';

const router = Router();

router.get('/', protect, authorize('admin', 'cashier'), getInstallmentPlans);
router.post('/', protect, authorize('admin', 'cashier'), validate(installmentPlanSchema), createInstallmentPlan);
router.post('/:id/payments', protect, authorize('admin', 'cashier'), validate(installmentPaymentSchema), payInstallment);

export default router;
