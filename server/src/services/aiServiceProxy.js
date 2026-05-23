import apiResponse from "../utils/apiResponse.js";
import logger from "../utils/logger.js";

const toBool = (value, fallback = false) => {
    if (value === undefined || value === null || value === "") return fallback;
    return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

const getAIServiceUrl = () => (process.env.AI_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export const proxyAIChat = (endpoint, { stream = false, authenticated = false } = {}) => async (req, res, next) => {
    if (!toBool(process.env.AI_SERVICE_PROXY_CHAT, true)) {
        return next();
    }

    const controller = new AbortController();
    const timeout = Number(process.env.AI_SERVICE_PROXY_TIMEOUT_MS || 30000);
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(`${getAIServiceUrl()}${endpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(authenticated && req.user?.id ? { "X-User-Id": req.user.id } : {}),
            },
            body: JSON.stringify(req.body || {}),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            logger.warn(`[AI Proxy] ${endpoint} returned ${response.status}; falling back to Node controller`);
            return next();
        }

        if (stream) {
            res.status(response.status);
            res.setHeader("Content-Type", response.headers.get("content-type") || "text/event-stream; charset=utf-8");
            res.setHeader("Cache-Control", "no-cache, no-transform");
            res.setHeader("Connection", "keep-alive");
            res.flushHeaders?.();

            for await (const chunk of response.body) {
                res.write(Buffer.from(chunk));
            }
            return res.end();
        }

        const payload = await response.json();
        if (payload?.success === false) {
            return res.status(429).json(payload);
        }

        return apiResponse(res, 200, "AI response generated", payload?.data ?? payload);
    } catch (error) {
        clearTimeout(timeoutId);
        logger.warn(`[AI Proxy] ${endpoint} unavailable; falling back to Node controller: ${error.message}`);
        return next();
    }
};

