import crypto from "crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../user/user.model.js";
import logger from "../../utils/logger.js";
import Patient from "../patient/patient.model.js";
import { generateAccessToken, generateRefreshToken } from "../../utils/generateToken.js";
import { sendEmail } from "../../utils/sendEmail.js";
import { welcomeRegisterTemplate, resetPasswordTemplate } from "../../utils/emailTemplates.js";

const buildAuthPayload = async (user) => {
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    return {
        user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            avatar: user.avatar,
            role: user.role,
            updatedAt: user.updatedAt,
        },
        accessToken,
        refreshToken,
    };
};

const ensurePatientProfile = async (user) => {
    if (user?.role !== "patient") return;

    const existingProfile = await Patient.findOne({ userId: user._id }).select("_id");
    if (existingProfile) return;

    await Patient.create({ userId: user._id });
    logger.warn(`[Patient] Auto-created missing profile for user ${user._id}`);
};

export const register = async (userData) => {
    const { fullName, email, password, phone } = userData;
    // NOTE: role không được nhận từ request body.
    // Public registration luôn tạo tài khoản "patient".

    const userExists = await User.findOne({ email });
    if (userExists) {
        throw new Error("User already exists");
    }

    const user = await User.create({ fullName, email, password, phone, role: "patient" });

    await Patient.create({ userId: user._id });

    // Gửi email chào mừng (không block đăng ký nếu gửi thất bại)
    try {
        const loginUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/login`;
        const { subject, html } = welcomeRegisterTemplate({ fullName, loginUrl });
        await sendEmail(email, subject, html);
    } catch (emailErr) {
        logger.warn(`[Auth] Không gửi được email chào mừng: ${emailErr.message}`);
    }

    return buildAuthPayload(user);
};

export const login = async (email, password) => {
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.matchPassword(password))) {
        const err = new Error("Email hoặc mật khẩu không đúng");
        err.statusCode = 401;
        throw err;
    }

    if (user.isActive === false) {
        const err = new Error("Tài khoản đã bị vô hiệu hoá");
        err.statusCode = 403;
        throw err;
    }

    await ensurePatientProfile(user);
    return buildAuthPayload(user);
};

export const loginWithGoogle = async (idToken) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
        const err = new Error("Google login is not configured");
        err.statusCode = 500;
        throw err;
    }

    if (!idToken) {
        const err = new Error("Google token is required");
        err.statusCode = 400;
        throw err;
    }

    let payload;
    try {
        const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
    } catch {
        const err = new Error("Google token không hợp lệ");
        err.statusCode = 401;
        throw err;
    }

    if (!payload?.email || payload.email_verified === false) {
        const err = new Error("Không thể xác thực email Google");
        err.statusCode = 401;
        throw err;
    }

    let user = await User.findOne({ email: payload.email });

    if (!user) {
        user = await User.create({
            fullName: payload.name || payload.email.split("@")[0],
            email: payload.email,
            password: crypto.randomBytes(24).toString("hex"),
            phone: "",
            role: "patient",
            avatar: payload.picture,
        });

        await Patient.create({ userId: user._id });
    }

    if (user.isActive === false) {
        const err = new Error("Tài khoản đã bị vô hiệu hoá");
        err.statusCode = 403;
        throw err;
    }

    await ensurePatientProfile(user);
    return buildAuthPayload(user);
};

export const refresh = async (refreshToken) => {
    if (!refreshToken) {
        const err = new Error("No refresh token provided");
        err.statusCode = 401;
        throw err;
    }

    // Verify token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Find user and check if token matches the DB
    const user = await User.findOne({ _id: decoded.id, refreshToken }).select("+refreshToken");
    if (!user) {
        const err = new Error("Invalid refresh token");
        err.statusCode = 401;
        throw err;
    }

    const accessToken = generateAccessToken(user._id, user.role);
    return { accessToken };
};

export const logout = async (userId) => {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
    return { message: "Logged out successfully" };
};

// ──────────────────────────────────────────────────────────────────
// forgotPassword — gửi email reset link
// BUG FIX: Trước đây tạo nodemailer transporter riêng (duplicate sendEmail.js).
//          Nay dùng sendEmail utility dùng chung.
// ──────────────────────────────────────────────────────────────────
export const forgotPassword = async (email) => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        const err = new Error("Email không hợp lệ");
        err.statusCode = 400;
        throw err;
    }

    const user = await User.findOne({ email }).select("+resetPasswordToken +resetPasswordExpires");
    if (!user) {
        const err = new Error("Email không tồn tại trong hệ thống");
        err.statusCode = 404;
        throw err;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 phút
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password?token=${rawToken}`;
    const { subject, html } = resetPasswordTemplate({ resetUrl });

    const sent = await sendEmail(user.email, subject, html).catch(async (emailErr) => {
        // Nếu gửi email thất bại → xóa token, ném lỗi rõ ràng
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save({ validateBeforeSave: false });
        const err = new Error(`Không thể gửi email đặt lại mật khẩu: ${emailErr.message}`);
        err.statusCode = 500;
        throw err;
    });

    return { message: "Email đặt lại mật khẩu đã được gửi" };
};

// ──────────────────────────────────────────────────────────────────
// resetPassword — đặt lại mật khẩu bằng token
// ──────────────────────────────────────────────────────────────────
export const resetPassword = async (token, newPassword) => {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
        const err = new Error("Token không hợp lệ hoặc đã hết hạn");
        err.statusCode = 400;
        throw err;
    }

    if (!newPassword || newPassword.length < 6) {
        const err = new Error("Mật khẩu phải có ít nhất 6 ký tự");
        err.statusCode = 400;
        throw err;
    }

    user.password = newPassword; // pre-save hook sẽ hash
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return { message: "Đặt lại mật khẩu thành công" };
};
