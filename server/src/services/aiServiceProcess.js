import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import logger from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_ROOT = path.resolve(__dirname, "../..");
const AI_SERVICE_DIR = path.join(SERVER_ROOT, "ai_service");

let aiServiceProcess = null;

const toBool = (value, fallback = false) => {
    if (value === undefined || value === null || value === "") return fallback;
    return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

const getPythonExecutable = () => {
    if (process.env.AI_SERVICE_PYTHON_PATH) return process.env.AI_SERVICE_PYTHON_PATH;

    const candidates = process.platform === "win32"
        ? [
            path.join(AI_SERVICE_DIR, "venv", "Scripts", "python.exe"),
            path.join(AI_SERVICE_DIR, ".venv", "Scripts", "python.exe"),
        ]
        : [
            path.join(AI_SERVICE_DIR, "venv", "bin", "python"),
            path.join(AI_SERVICE_DIR, ".venv", "bin", "python"),
        ];

    return candidates.find((candidate) => fs.existsSync(candidate)) || "python";
};

const waitForHealth = (url, timeoutMs = 1200) => new Promise((resolve) => {
    const request = http.get(url, { timeout: timeoutMs }, (response) => {
        response.resume();
        resolve(response.statusCode >= 200 && response.statusCode < 500);
    });

    request.on("timeout", () => {
        request.destroy();
        resolve(false);
    });
    request.on("error", () => resolve(false));
});

export const startAIService = async () => {
    const enabled = toBool(process.env.AI_SERVICE_ENABLED, true);
    if (!enabled) {
        logger.info("[AI Service] Disabled by AI_SERVICE_ENABLED=false");
        return null;
    }

    if (!fs.existsSync(path.join(AI_SERVICE_DIR, "main.py"))) {
        logger.warn(`[AI Service] Skipped: ${path.join(AI_SERVICE_DIR, "main.py")} not found`);
        return null;
    }

    const host = process.env.AI_SERVICE_HOST || "127.0.0.1";
    const port = process.env.AI_SERVICE_PORT || "8000";
    const healthUrl = process.env.AI_SERVICE_HEALTH_URL || `http://${host}:${port}/health`;

    if (await waitForHealth(healthUrl)) {
        logger.info(`[AI Service] Already running at ${healthUrl}`);
        return null;
    }

    const pythonExecutable = getPythonExecutable();
    const args = ["-m", "uvicorn", "main:app", "--host", host, "--port", String(port)];
    if (toBool(process.env.AI_SERVICE_RELOAD, false)) {
        args.push("--reload");
    }

    try {
        aiServiceProcess = spawn(pythonExecutable, args, {
            cwd: AI_SERVICE_DIR,
            env: {
                ...process.env,
                PYTHONUNBUFFERED: "1",
            },
            stdio: ["ignore", "pipe", "pipe"],
            windowsHide: true,
        });
    } catch (error) {
        const message = `[AI Service] Failed to start: ${error.message}`;
        if (toBool(process.env.AI_SERVICE_REQUIRED, false)) {
            logger.error(message);
            process.exit(1);
        }
        logger.warn(message);
        return null;
    }

    aiServiceProcess.stdout.on("data", (data) => {
        logger.info(`[AI Service] ${data.toString().trim()}`);
    });

    aiServiceProcess.stderr.on("data", (data) => {
        logger.warn(`[AI Service] ${data.toString().trim()}`);
    });

    aiServiceProcess.on("error", (error) => {
        const message = `[AI Service] Failed to start: ${error.message}`;
        if (toBool(process.env.AI_SERVICE_REQUIRED, false)) {
            logger.error(message);
            process.exit(1);
        }
        logger.warn(message);
    });

    aiServiceProcess.on("exit", (code, signal) => {
        if (code === 0 || signal) {
            logger.info(`[AI Service] Stopped${signal ? ` by ${signal}` : ""}`);
            return;
        }

        const message = `[AI Service] Exited with code ${code}`;
        if (toBool(process.env.AI_SERVICE_REQUIRED, false)) {
            logger.error(message);
            process.exit(1);
        }
        logger.warn(message);
    });

    logger.info(`[AI Service] Starting at ${healthUrl}`);
    return aiServiceProcess;
};

export const stopAIService = () => {
    if (!aiServiceProcess || aiServiceProcess.killed) return;
    aiServiceProcess.kill();
};
