import express from "express";
import { getNotifications, markAsRead, deleteNotification, markAllAsRead } from "./notification.controller.js";
import Notification from "./notification.model.js";
import apiResponse from "../../utils/apiResponse.js";
import { protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

// Specific paths BEFORE param paths to avoid collision
router.patch("/read-all", markAllAsRead);

router.get("/unread-count", async (req, res, next) => {
    try {
        const count = await Notification.countDocuments({ userId: req.user.id, isRead: false });
        return apiResponse(res, 200, "Unread count", { count });
    } catch (error) {
        next(error);
    }
});

router.get("/", getNotifications);
router.patch("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

export default router;
