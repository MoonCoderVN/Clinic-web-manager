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
import { proxyAIChat } from "../../services/aiServiceProxy.js";

const router = express.Router();

// ── Public routes ─────────────────────────────────────────────────────────────

router.post("/public", proxyAIChat("/chat/public"), sendPublicMessage);
router.post("/public/stream", proxyAIChat("/chat/public/stream", { stream: true }), streamPublicMessage);

// ── Authenticated routes ──────────────────────────────────────────────────────

router.use(protect);

router.post("/", proxyAIChat("/chat/message", { authenticated: true }), sendMessage);
router.post("/stream", proxyAIChat("/chat/stream", { authenticated: true, stream: true }), streamMessage);
router.get("/history", getChatHistory);
router.delete("/history", clearChatHistory);

export default router;
