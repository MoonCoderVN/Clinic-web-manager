import express from "express";
import {
    sendMessage,
    getChatHistory,
    clearChatHistory,
    sendPublicMessage,
    streamMessage,
    streamPublicMessage,
} from "./chat.controller.js";
import { protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// Route công khai cho ChatbotWidget (không cần đăng nhập)
router.post("/public", sendPublicMessage);
router.post("/public/stream", streamPublicMessage);

// Routes cần đăng nhập
router.use(protect);
router.post("/", sendMessage);
router.post("/stream", streamMessage);
router.get("/history", getChatHistory);
router.delete("/history", clearChatHistory);

export default router;
