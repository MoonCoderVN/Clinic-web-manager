import * as authService from "./auth.service.js";
import apiResponse from "../../utils/apiResponse.js";

export const register = async (req, res, next) => {
    try {
        const { user, accessToken, refreshToken } = await authService.register(req.body);
        
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        return apiResponse(res, 201, "User registered successfully", { user, token: accessToken });
    } catch (error) {
        next(error);
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const { user, accessToken, refreshToken } = await authService.login(email, password);
        
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return apiResponse(res, 200, "Login successful", { user, token: accessToken });
    } catch (error) {
        next(error);
    }
};

export const googleLogin = async (req, res, next) => {
    try {
        const { idToken } = req.body;
        const { user, accessToken, refreshToken } = await authService.loginWithGoogle(idToken);

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return apiResponse(res, 200, "Google login successful", { user, token: accessToken });
    } catch (error) {
        next(error);
    }
};

export const refresh = async (req, res, next) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        const { accessToken } = await authService.refresh(refreshToken);
        return apiResponse(res, 200, "Token refreshed", { token: accessToken });
    } catch (error) {
        next(error);
    }
};

export const logout = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        });
        
        if (userId) {
            await authService.logout(userId);
        }
        
        return apiResponse(res, 200, "Logged out successfully", {});
    } catch (error) {
        next(error);
    }
};

export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const result = await authService.forgotPassword(email);
        return apiResponse(res, 200, "Reset password email sent", result);
    } catch (error) {
        next(error);
    }
};

export const resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;
        const result = await authService.resetPassword(token, newPassword);
        return apiResponse(res, 200, "Password reset successfully", result);
    } catch (error) {
        next(error);
    }
};
