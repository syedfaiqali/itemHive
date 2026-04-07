import { Router } from 'express';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct, getProductImageSuggestions } from '../controllers/productController';
import { protect, authorize } from '../middleware/auth';
import { validate, productSchema } from '../middleware/validate';

const router = Router();

router.get('/', protect, getProducts);
router.get('/image-suggestions', protect, getProductImageSuggestions);
router.get('/:id', protect, getProductById);
router.post('/', protect, authorize('admin'), validate(productSchema), createProduct);
router.put('/:id', protect, authorize('admin'), validate(productSchema), updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

export default router;
