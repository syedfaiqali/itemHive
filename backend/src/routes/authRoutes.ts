import { Router } from 'express';
import { getCurrentUser, login, register } from '../controllers/authController';
import { validate, loginSchema, registerSchema } from '../middleware/validate';
import { optionalProtect, protect } from '../middleware/auth';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.get('/me', protect, getCurrentUser);
router.post('/register', optionalProtect, validate(registerSchema), register);

export default router;
