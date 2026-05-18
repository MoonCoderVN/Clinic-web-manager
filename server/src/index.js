import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";

// Load env TRƯỚC KHI làm bất cứ điều gì
dotenv.config();

import cookieParser from "cookie-parser";

import connectDB from "./config/db.js";
import "./jobs/expiredAppointmentJob.js";
import "./jobs/nextDateReminderJob.js";
import "./jobs/appointmentReminderJob.js";
import seedAdmin from "./config/seedAdmin.js";
import { UPLOADS_DIR, ensureUploadDirs } from "./config/uploadPaths.js";
import { notFound, errorHandler } from "./middlewares/errorHandler.js";
import { apiLimiter, publicLimiter } from "./middlewares/rateLimit.js";
import logger from "./utils/logger.js";

// Routes
import authRoutes from "./modules/auth/auth.route.js";
import userRoutes from "./modules/user/user.route.js";
import patientRoutes from "./modules/patient/patient.route.js";
import doctorRoutes from "./modules/doctor/doctor.route.js";
import appointmentRoutes from "./modules/appointment/appointment.route.js";
import serviceRoutes from "./modules/service/service.route.js";
import scheduleRoutes from "./modules/schedule/schedule.route.js";
import examResultRoutes from "./modules/examResult/examResult.route.js";
import notificationRoutes from "./modules/notification/notification.route.js";
import adminRoutes from "./modules/admin/admin.route.js";
import chatRoutes from "./modules/chat/chat.route.js";
import knowledgeRoutes from "./modules/chat/knowledge.route.js";
import leaveRequestRoutes from "./modules/leaveRequest/leaveRequest.route.js";
import { getPublicSettings } from "./modules/admin/settings.controller.js";
import { configureSocket } from "./realtime/socket.js";

const app = express();
const server = http.createServer(app);
ensureUploadDirs();

// Kết nối DB rồi seed admin
connectDB().then(() => seedAdmin());

const allowedOrigins = [process.env.CLIENT_URL, "http://localhost:5173", "http://localhost:5174"];
configureSocket(server, allowedOrigins);
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, { ip: req.ip });
    next();
});

app.use("/uploads", express.static(UPLOADS_DIR, {
  maxAge: "7d",
  immutable: true,
}));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/exam-results", examResultRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/leave-requests", leaveRequestRoutes);
app.use("/api/admin", adminRoutes);
app.get("/api/settings/public", getPublicSettings);
app.use("/api/chat", chatRoutes);
app.use("/api/knowledge", knowledgeRoutes);

app.get("/", (req, res) => res.send("DentaCare API is running..."));

app.use(notFound);
app.use(errorHandler);

// Validate required environment variables
const requiredEnvVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'MAIL_USER',
    'MAIL_PASS',
    'GEMINI_API_KEY'
];

const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingEnvVars.length > 0) {
    logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    console.log(`Server running on port ${PORT}`);
});
