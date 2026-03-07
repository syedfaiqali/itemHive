import { Router } from 'express';
import { getTransactions, createTransaction } from '../controllers/transactionController';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/', protect, getTransactions);
router.post('/', protect, createTransaction);

export default router;
