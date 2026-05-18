import fs from "fs";
import User from "./user.model.js";
import apiResponse from "../../utils/apiResponse.js";
import bcrypt from "bcryptjs";
import { localUploadPathFromPublicPath, toAvatarPublicPath } from "../../config/uploadPaths.js";
import { emitPublic, emitToRole, emitToUser } from "../../realtime/socket.js";

const emitProfileChanged = (user, action = "updated") => {
    const userId = user?._id || user?.id;
    const payload = { action, userId: userId?.toString(), role: user?.role };
    emitToUser(userId, "profile:changed", payload);
    emitToRole("admin", "user:changed", payload);
    if (user?.role === "doctor") {
        emitPublic("doctor:changed", payload);
        emitPublic("public:landing-changed", { source: "doctor-profile", action });
    }
};

// ── GET /users/me ──────────────────────────────────────────────────
export const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        return apiResponse(res, 200, "User data retrieved", user);
    } catch (error) {
        next(error);
    }
};

export const updateProfile = async (req, res, next) => {
    try {
        // Prevent role/password escalation via this endpoint
        const { role, password, isActive, ...safeBody } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: safeBody },
            { new: true, runValidators: true }
        );
        emitProfileChanged(updatedUser, "updated");
        return apiResponse(res, 200, "Profile updated", updatedUser);
    } catch (error) {
        next(error);
    }
};

// ── POST /users/avatar — Upload avatar ────────────────────────────
export const uploadAvatar = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Không có file nào được tải lên" });
        }

        // Build public URL (served via express.static "/uploads")
        const avatarUrl = toAvatarPublicPath(req.file.filename);

        // Delete old avatar file if it's a local upload (not external URL)
        const user = await User.findById(req.user.id);
        if (user?.avatar && user.avatar.startsWith("/uploads/")) {
            const oldFilePath = localUploadPathFromPublicPath(user.avatar);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { avatar: avatarUrl },
            { new: true }
        );

        emitProfileChanged(updatedUser, "avatar-updated");
        return apiResponse(res, 200, "Cập nhật avatar thành công", {
            avatar: updatedUser.avatar,
            user: updatedUser,
        });
    } catch (error) {
        next(error);
    }
};

// ── PUT /users/me/change-password ──────────────────────────────────────────────────
export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới" });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: "Mật khẩu mới phải có ít nhất 6 ký tự" });
        }
        const user = await User.findById(req.user.id).select("+password");
        if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản" });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Mật khẩu hiện tại không chính xác" });
        }

        // BUG FIX: assign plain password — pre-save hook sẽ tự hash.
        // Code cũ hash thủ công rồi save() → pre-save hook hash lần nữa = double hash
        user.password = newPassword;
        await user.save();

        return apiResponse(res, 200, "Đổi mật khẩu thành công", null);
    } catch (error) {
        next(error);
    }
};
