import { Router } from 'express';
import { getTransactions, createTransaction, deleteTransaction } from '../controllers/transactionController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.get('/', protect, getTransactions);
router.post('/', protect, authorize('super_admin', 'admin', 'user'), createTransaction);
router.delete('/:id', protect, authorize('super_admin', 'admin'), deleteTransaction);

export default router;
