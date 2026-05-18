import rateLimit from "express-rate-limit";

const isDevelopment = process.env.NODE_ENV !== "production";
const toPositiveNumber = (value, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
};

const authWindowMinutes = toPositiveNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES, isDevelopment ? 1 : 15);
const authMaxRequests = toPositiveNumber(process.env.AUTH_RATE_LIMIT_MAX, isDevelopment ? 100 : 5);

export const authLimiter = rateLimit({
    windowMs: authWindowMinutes * 60 * 1000,
    max: authMaxRequests,
    message: {
        success: false,
        message: `Qua nhieu lan dang nhap that bai. Vui long thu lai sau ${authWindowMinutes} phut.`,
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export const publicLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        message: "Qua nhieu yeu cau. Vui long thu lai sau 1 gio.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export const apiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: "Qua nhieu yeu cau. Vui long thu lai sau 1 gio.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        message: "Qua nhieu uploads. Vui long thu lai sau 1 gio.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});
