import Notification from "./notification.model.js";
import { emitToUser } from "../../realtime/socket.js";

// ──────────────────────────────────────────────────────────────────
// Helper: Tạo notification trong DB
// Không throw — notification failure không nên block main flow
// ──────────────────────────────────────────────────────────────────
export const createNotification = async (userId, type, title, message) => {
    try {
        const notification = await Notification.create({ userId, type, title, message });
        emitToUser(userId, "notification:new", { notification });
        return notification;
    } catch (error) {
        console.error("Failed to create notification:", error.message);
    }
};
