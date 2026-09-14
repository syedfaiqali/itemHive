import { Router } from 'express';
import { createCreditPayment, getCreditCustomers, getCreditPayments } from '../controllers/creditController';
import { protect, authorize, requireScreenAccess } from '../middleware/auth';
import { creditPaymentSchema, validate } from '../middleware/validate';

const router = Router();

router.get('/customers', protect, authorize('super_admin', 'admin', 'user'), requireScreenAccess('credits', 'customer_records'), getCreditCustomers);
router.get('/payments', protect, authorize('super_admin', 'admin', 'user'), requireScreenAccess('credits'), getCreditPayments);
router.post('/payments', protect, authorize('super_admin', 'admin', 'user'), requireScreenAccess('credits'), validate(creditPaymentSchema), createCreditPayment);

export default router;
