import Notification from "./notification.model.js";
import apiResponse from "../../utils/apiResponse.js";
import { emitToUser } from "../../realtime/socket.js";

export const getNotifications = async (req, res, next) => {
    try {
        const notifications = await Notification.find({ userId: req.user.id }).sort("-sentAt");
        return apiResponse(res, 200, "Notifications retrieved", notifications);
    } catch (error) {
        next(error);
    }
};

export const markAsRead = async (req, res, next) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { isRead: true },
            { new: true }
        );
        if (!notification) {
            return res.status(404).json({ success: false, message: "Không tìm thấy thông báo" });
        }
        emitToUser(req.user.id, "notification:changed", { action: "read", notificationId: notification?._id });
        return apiResponse(res, 200, "Notification marked as read", notification);
    } catch (error) {
        next(error);
    }
};

export const deleteNotification = async (req, res, next) => {
    try {
        const notification = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!notification) {
            return res.status(404).json({ success: false, message: "Không tìm thấy thông báo" });
        }
        emitToUser(req.user.id, "notification:changed", { action: "delete", notificationId: req.params.id });
        return apiResponse(res, 200, "Notification deleted");
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// PATCH /notifications/read-all — Đánh dấu tất cả đã đọc
// ──────────────────────────────────────────────────────────────────
export const markAllAsRead = async (req, res, next) => {
    try {
        await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
        emitToUser(req.user.id, "notification:changed", { action: "read-all" });
        return apiResponse(res, 200, "Đã đánh dấu tất cả là đã đọc");
    } catch (error) {
        next(error);
    }
};
