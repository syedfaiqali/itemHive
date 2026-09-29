import { Router } from 'express';
import Joi from 'joi';
import { recommendTheme } from '../controllers/themeRecommendationController';
import { paletteKeys } from '../services/logoTheme';
import { updateAppearance } from '../controllers/authController';
import { getCurrentUser, login, register } from '../controllers/authController';
import { validate, loginSchema, registerSchema } from '../middleware/validate';
import { optionalProtect, protect } from '../middleware/auth';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.get('/me', protect, getCurrentUser);
router.post('/me/appearance/recommend', protect, validate(Joi.object({
    logo: Joi.string().max(683000).pattern(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/).required(),
    mode: Joi.string().valid('light', 'dark').required(),
    exclude: Joi.array().max(12).items(Joi.object(Object.fromEntries(paletteKeys.map(key => [key, Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).required()])))).default([]),
})), recommendTheme);
router.put('/me/appearance', protect, validate(Joi.object({
    themeColor: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).required(),
    backgroundColor: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).allow('').default(''),
    sidebarColor: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).allow('').default(''),
    navbarColor: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).allow('').default(''),
    borderColor: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).allow('').default(''),
    headingColor: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).allow('').default(''),
    secondaryTextColor: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).allow('').default(''),
    paperColor: Joi.any().strip(),
    inputColor: Joi.any().strip(),
    tableHeaderColor: Joi.any().strip(),
    secondaryColor: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).allow('').default(''),
    successColor: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).allow('').default(''),
    warningColor: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).allow('').default(''),
    errorColor: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).allow('').default(''),
    sidebarFontColor: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).allow('').default(''),
    navbarFontColor: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).allow('').default(''),
    fontColor: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).allow('').required(),
    logo: Joi.string().max(700000).pattern(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/).allow('').required(),
})), updateAppearance);
router.post('/register', optionalProtect, validate(registerSchema), register);

export default router;
