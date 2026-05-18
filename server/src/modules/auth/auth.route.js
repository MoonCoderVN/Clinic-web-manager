import express from "express";
import { register, login, googleLogin, forgotPassword, resetPassword, refresh, logout } from "./auth.controller.js";
import { optionalProtect } from "../../middlewares/authMiddleware.js";
import { validate } from "../../middlewares/validation.js";
import { 
    registerSchema, 
    loginSchema, 
    googleLoginSchema, 
    forgotPasswordSchema, 
    resetPasswordSchema 
} from "../../validations/auth.validation.js";
import { authLimiter } from "../../middlewares/rateLimit.js";

const router = express.Router();

router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/google", authLimiter, validate(googleLoginSchema), googleLogin);
router.post("/refresh", refresh);
router.post("/logout", optionalProtect, logout);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

export default router;
