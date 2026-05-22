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

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "";

// ── Proxy helper to Python AI service ───────────────────────────────────────

const proxyToAi = async (aiPath, req, res, extraHeaders = {}) => {
    const url = `${AI_SERVICE_URL}${aiPath}`;
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...extraHeaders },
        body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
};

const proxyStreamToAi = async (aiPath, req, res, extraHeaders = {}) => {
    const url = `${AI_SERVICE_URL}${aiPath}`;
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...extraHeaders },
        body: JSON.stringify(req.body),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            res.write(decoder.decode(value, { stream: true }));
        }
    } finally {
        reader.releaseLock();
        res.end();
    }
};

// ── Public routes ─────────────────────────────────────────────────────────────

router.post("/public", async (req, res, next) => {
    if (!AI_SERVICE_URL) return sendPublicMessage(req, res, next);
    try {
        await proxyToAi("/chat/public", req, res);
    } catch (err) {
        console.error("[Proxy] AI service unavailable, falling back:", err.message);
        sendPublicMessage(req, res, next);
    }
});

router.post("/public/stream", async (req, res, next) => {
    if (!AI_SERVICE_URL) return streamPublicMessage(req, res, next);
    try {
        await proxyStreamToAi("/chat/public/stream", req, res);
    } catch (err) {
        console.error("[Proxy] AI service unavailable, falling back:", err.message);
        streamPublicMessage(req, res, next);
    }
});

// ── Authenticated routes ──────────────────────────────────────────────────────

router.use(protect);

router.post("/", async (req, res, next) => {
    if (!AI_SERVICE_URL) return sendMessage(req, res, next);
    try {
        await proxyToAi("/chat/message", req, res, { "x-user-id": req.user?.id || "" });
    } catch (err) {
        console.error("[Proxy] AI service unavailable, falling back:", err.message);
        sendMessage(req, res, next);
    }
});

router.post("/stream", async (req, res, next) => {
    if (!AI_SERVICE_URL) return streamMessage(req, res, next);
    try {
        await proxyStreamToAi("/chat/stream", req, res, { "x-user-id": req.user?.id || "" });
    } catch (err) {
        console.error("[Proxy] AI service unavailable, falling back:", err.message);
        streamMessage(req, res, next);
    }
});

router.get("/history", getChatHistory);
router.delete("/history", clearChatHistory);

export default router;
