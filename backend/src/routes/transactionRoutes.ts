import { Router } from 'express';
import { getTransactions, createTransaction, deleteTransaction } from '../controllers/transactionController';
import { protect, authorize, requireScreenAccess } from '../middleware/auth';

const router = Router();

router.get('/', protect, requireScreenAccess('dashboard', 'pos', 'orders', 'transactions', 'customer_records', 'reports'), getTransactions);
router.post('/', protect, authorize('super_admin', 'admin', 'user'), requireScreenAccess('pos', 'orders', 'inventory_reduce'), createTransaction);
router.delete('/:id', protect, authorize('super_admin', 'admin'), requireScreenAccess('transactions', 'orders'), deleteTransaction);

export default router;
