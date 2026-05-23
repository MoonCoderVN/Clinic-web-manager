/**
 * nextDateReminderJob.js
 * Chạy mỗi ngày lúc 08:00 — tìm ExamResult có nextDate đúng 3 ngày nữa,
 * gửi ĐỒNG THỜI:
 *   1. In-app notification (Notification collection)
 *   2. Email thực sự qua nodemailer
 *
 * Setup trong server/src/index.js:
 *   import "./jobs/nextDateReminderJob.js";
 *
 * Cần cài: npm install node-cron
 */

import cron from "node-cron";
import logger from "../utils/logger.js";
import ExamResult from "../modules/examResult/examResult.model.js";
import Doctor from "../modules/doctor/doctor.model.js";
import User from "../modules/user/user.model.js";
import { createNotification } from "../modules/notification/notification.service.js";
import { sendEmail } from "../utils/sendEmail.js";
import { nextDateReminderTemplate } from "../utils/emailTemplates.js";

const BOOKING_URL = `${process.env.CLIENT_URL || "http://localhost:5173"}/patient/book`;

const getDayRange = (daysFromNow) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + daysFromNow);
    return {
        start: new Date(d),
        end: new Date(new Date(d).setHours(23, 59, 59, 999)),
    };
};

export const sendNextDateReminders = async () => {
    try {
        const { start, end } = getDayRange(3);

        const results = await ExamResult.find({
            nextDate: { $gte: start, $lte: end },
            reminderSent: { $ne: true },
        }).populate({
            path: "appointmentId",
            select: "doctorId patientId",
        });

        if (!results.length) {
            logger.info("[ReminderJob] Không có tái khám nào trong 3 ngày tới.");
            return;
        }

        logger.info(`[ReminderJob] Xử lý ${results.length} tái khám...`);

        for (const result of results) {
            // patientId trong ExamResult là User._id (ref: "User")
            const patientUserId = result.patientId || result.appointmentId?.patientId;

            // Trực tiếp lookup User vì patientId đã là User._id
            let patientUser = null;
            if (patientUserId) {
                patientUser = await User.findById(patientUserId).select("fullName email").catch(() => null);
            }

            const nextDateObj = new Date(result.nextDate);
            const daysLeft = Math.ceil((nextDateObj - new Date()) / (1000 * 60 * 60 * 24));
            const nextDateStr = nextDateObj.toLocaleDateString("vi-VN", {
                weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
            });

            // 1. In-app notification
            if (patientUserId) {
                await createNotification(
                    patientUser?._id || patientUserId,
                    "reminder",
                    "Nhắc tái khám sau 3 ngày",
                    `Bạn có lịch tái khám vào ${nextDateStr}. Đừng quên đặt lịch nếu chưa đặt!`
                );
            }

            // 2. Email cho patient
            if (patientUser?.email) {
                const { subject, html } = nextDateReminderTemplate({
                    patientName: patientUser.fullName || "Bạn",
                    diagnosis: result.diagnosis || "Kiểm tra định kỳ",
                    nextDateStr,
                    daysLeft,
                    bookingUrl: BOOKING_URL,
                });
                await sendEmail(patientUser.email, subject, html);
            }

            // 3. In-app notification cho bác sĩ
            const doctorId = result.appointmentId?.doctorId;
            if (doctorId) {
                const doctorProfile = await Doctor.findById(doctorId).select("userId");
                if (doctorProfile?.userId) {
                    await createNotification(
                        doctorProfile.userId,
                        "reminder",
                        "Nhắc tái khám bệnh nhân",
                        `Bệnh nhân ${patientUser?.fullName || ""} cần tái khám vào ${nextDateStr}.`
                    );
                }
            }

            // 4. Đánh dấu đã gửi
            await ExamResult.findByIdAndUpdate(result._id, { reminderSent: true });
            logger.info(`[ReminderJob] Sent reminder to ${patientUser?.email || String(patientUserId)}`);
        }

        logger.info("[ReminderJob] Hoàn tất.");
    } catch (err) {
        logger.error(`[ReminderJob] Lỗi: ${err.message}`);
    }
};

// Cron: 08:00 mỗi ngày giờ VN
cron.schedule("0 8 * * *", () => {
    logger.info("[ReminderJob] Bắt đầu kiểm tra...");
    sendNextDateReminders();
}, { timezone: "Asia/Ho_Chi_Minh" });

logger.info("[ReminderJob] Đã khởi tạo — chạy lúc 08:00 mỗi ngày.");