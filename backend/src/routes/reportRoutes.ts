import { Router } from 'express';
import { getSalesTrend, getCategoryValuation, getTopSellingProducts } from '../controllers/reportsController';
import { protect, authorize, requireScreenAccess } from '../middleware/auth';

const router = Router();

// Reports are largely for Admins
router.get('/sales-trend', protect, authorize('super_admin', 'admin'), requireScreenAccess('reports'), getSalesTrend);
router.get('/category-valuation', protect, authorize('super_admin', 'admin'), requireScreenAccess('reports'), getCategoryValuation);
router.get('/top-selling', protect, authorize('super_admin', 'admin'), requireScreenAccess('reports'), getTopSellingProducts);

export default router;
