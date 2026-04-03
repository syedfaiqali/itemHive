import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Express middleware factory for validating request body against a Joi schema.
 */
export const validate = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
        });
        if (error) {
            const details = error.details.map(d => d.message).join(', ');
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                details,
                code: 'VALIDATION_ERROR',
            });
        }
        req.body = value;
        next();
    };
};

// --- Schemas ---

export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
});

export const registerSchema = Joi.object({
    name: Joi.string().min(2).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('admin', 'cashier').optional(),
});

export const productSchema = Joi.object({
    id: Joi.string().required(),
    sku: Joi.string().required(),
    name: Joi.string().min(2).required(),
    category: Joi.string().required(),
    purchasePrice: Joi.number().min(0).required(),
    salePrice: Joi.number().min(0).required(),
    price: Joi.number().min(0).optional(),
    stock: Joi.number().min(0).required(),
    minStock: Joi.number().min(0).optional(),
    description: Joi.string().allow('').optional(),
    imageUrl: Joi.string().allow('').optional(),
    batchNumber: Joi.string().allow('').optional(),
    expiryDate: Joi.string().allow('').optional(),
    supplier: Joi.string().allow('').optional(),
});
