import Joi from "joi";

export const registerSchema = Joi.object({
    fullName: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().min(6).max(100).required(),
    phone: Joi.string().pattern(/^(\+?84|0)(\d{9,10})$/).optional().allow("")
});

export const loginSchema = Joi.object({
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().min(6).max(100).required()
});

export const googleLoginSchema = Joi.object({
    idToken: Joi.string().min(10).required()
});

export const refreshSchema = Joi.object({
    refreshToken: Joi.string().optional()
});

export const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().lowercase().required()
});

export const resetPasswordSchema = Joi.object({
    token: Joi.string().min(32).max(100).required(),
    newPassword: Joi.string().min(6).max(100).required()
});

export const updateProfileSchema = Joi.object({
    fullName: Joi.string().min(2).max(100).optional(),
    phone: Joi.string().pattern(/^(\+?84|0)(\d{9,10})$/).optional().allow(""),
    avatar: Joi.string().optional().allow("")
});
