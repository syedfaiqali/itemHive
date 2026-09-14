import { Router } from 'express';
import { createInstallmentPlan, getInstallmentPlans, payInstallment } from '../controllers/installmentController';
import { protect, authorize, requireInstallmentAccess, requireScreenAccess } from '../middleware/auth';
import { installmentPaymentSchema, installmentPlanSchema, validate } from '../middleware/validate';

const router = Router();

router.get('/', protect, authorize('super_admin', 'admin', 'user'), requireScreenAccess('installments', 'notifications'), requireInstallmentAccess, getInstallmentPlans);
router.post('/', protect, authorize('super_admin', 'admin', 'user'), requireScreenAccess('installments', 'pos'), requireInstallmentAccess, validate(installmentPlanSchema), createInstallmentPlan);
router.post('/:id/payments', protect, authorize('super_admin', 'admin', 'user'), requireScreenAccess('installments'), requireInstallmentAccess, validate(installmentPaymentSchema), payInstallment);

export default router;
