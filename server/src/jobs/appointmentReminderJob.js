/**
 * appointmentReminderJob.js
 * Chạy mỗi phút — tìm lịch hẹn có giờ khám còn đúng 1 tiếng nữa,
 * gửi email + in-app notification nhắc bệnh nhân.
 *
 * Setup trong server/src/index.js (thêm vào sau dòng import nextDateReminderJob):
 *   import "./jobs/appointmentReminderJob.js";
 */

import cron from "node-cron";
import logger from "../utils/logger.js";
import Appointment from "../modules/appointment/appointment.model.js";
import Doctor from "../modules/doctor/doctor.model.js";
import User from "../modules/user/user.model.js";
import Service from "../modules/service/service.model.js";
import { createNotification } from "../modules/notification/notification.service.js";
import { sendEmail } from "../utils/sendEmail.js";
import { appointmentHourReminderTemplate } from "../utils/emailTemplates.js";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

export const sendAppointmentHourReminders = async () => {
    try {
        const now = new Date();

        // Khung thời gian: từ 59 phút đến 61 phút kể từ bây giờ
        const from = new Date(now.getTime() + 59 * 60 * 1000);
        const to = new Date(now.getTime() + 61 * 60 * 1000);

        // Lấy ngày hôm nay (không có giờ) để lọc appointmentDate
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        // Tìm các lịch hẹn confirmed hôm nay, chưa gửi nhắc 1h
        const appointments = await Appointment.find({
            status: "confirmed",
            appointmentDate: { $gte: todayStart, $lte: todayEnd },
            hourReminderSent: { $ne: true },
        })
            .populate("patientId", "fullName email")
            .populate("serviceId", "name")
            .populate({ path: "doctorId", select: "userId", populate: { path: "userId", select: "fullName" } });

        if (!appointments.length) return;

        for (const appt of appointments) {
            // Ghép appointmentDate + startTime thành 1 Date object
            const startTime = appt.startTime || appt.timeSlot;
            if (!startTime) continue;

            const timeParts = startTime.split(":");
            if (timeParts.length !== 2) {
                logger.warn(`[HourReminder] Invalid time format: ${startTime}`);
                continue;
            }
            const hours = parseInt(timeParts[0], 10);
            const minutes = parseInt(timeParts[1], 10);
            if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                logger.warn(`[HourReminder] Invalid time values: ${startTime}`);
                continue;
            }
            const apptDateTime = new Date(appt.appointmentDate || appt.date);
            apptDateTime.setHours(hours, minutes, 0, 0);

            // Kiểm tra có nằm trong khung 59–61 phút không
            if (apptDateTime < from || apptDateTime > to) continue;

            // Lấy thông tin đã populate ở query gốc để tránh N+1 query.
            const patient = appt.patientId;
            if (!patient) continue;

            const service = appt.serviceId;

            const doctorProfile = appt.doctorId;
            let doctorName = "Bác sĩ phụ trách";
            if (doctorProfile?.userId?.fullName) doctorName = doctorProfile.userId.fullName;

            const dateStr = (appt.appointmentDate || appt.date).toLocaleDateString("vi-VN", {
                weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
            });

            // 1. In-app notification
            await createNotification(
                patient._id,
                "reminder",
                "⏰ Nhắc lịch hẹn sau 1 tiếng",
                `Bạn có lịch khám lúc ${startTime} hôm nay với ${doctorName}. Vui lòng chuẩn bị!`
            );

            // 2. Email
            if (patient.email) {
                const { subject, html } = appointmentHourReminderTemplate({
                    patientName: patient.fullName || "Bạn",
                    serviceName: service?.name || "Khám nha khoa",
                    doctorName,
                    dateStr,
                    timeStr: startTime,
                    bookingUrl: `${CLIENT_URL}/patient/appointments`,
                });
                await sendEmail(patient.email, subject, html);
            }

            // 3. Đánh dấu đã gửi (thêm field hourReminderSent vào model)
            await Appointment.findByIdAndUpdate(appt._id, { hourReminderSent: true });
            logger.info(`[HourReminder] Sent reminder to ${patient.email} — ${startTime}`);
        }
    } catch (err) {
        logger.error(`[HourReminder] Lỗi: ${err.message}`);
    }
};

// Chạy mỗi phút để bắt đúng khung ±1 phút
cron.schedule("* * * * *", () => {
    sendAppointmentHourReminders();
}, { timezone: "Asia/Ho_Chi_Minh" });

logger.info("[HourReminder] Đã khởi tạo — kiểm tra mỗi phút.");
