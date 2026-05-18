import cron from "node-cron";
import Appointment from "../modules/appointment/appointment.model.js";
import User from "../modules/user/user.model.js";
import { createNotification } from "../modules/notification/notification.service.js";
import { emitPublic } from "../realtime/socket.js";

const EXPIRABLE_STATUSES = ["pending", "confirmed", "rescheduled"];

const parseTimeParts = (value) => {
    const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

    return { hours, minutes };
};

const parseLocalDateOnly = (value) => {
    if (!value) return null;
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        const date = new Date(value);
        date.setHours(0, 0, 0, 0);
        return date;
    }

    const raw = String(value).trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
        date.setHours(0, 0, 0, 0);
        return date;
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
};

const getAppointmentDateTime = (appointment) => {
    const dateValue = appointment.appointmentDate || appointment.date;
    const timeValue = appointment.startTime || appointment.timeSlot;
    if (!dateValue || !timeValue) return null;

    const time = parseTimeParts(timeValue);
    if (!time) return null;

    const dateTime = parseLocalDateOnly(dateValue);
    if (!dateTime) return null;
    dateTime.setHours(time.hours, time.minutes, 0, 0);
    return dateTime;
};

const formatAppointmentLabel = (appointment) => {
    const dateValue = appointment.appointmentDate || appointment.date;
    const timeValue = appointment.startTime || appointment.timeSlot;
    const dateLabel = dateValue ? new Date(dateValue).toLocaleDateString("vi-VN") : "ngày đã đặt";
    return `${timeValue || "giờ đã đặt"} ngày ${dateLabel}`;
};

const createExpiryNotifications = async (appointments) => {
    if (!appointments.length) return;

    const admins = await User.find({ role: "admin" }).select("_id").lean();
    const tasks = [];

    for (const appointment of appointments) {
        const appointmentLabel = formatAppointmentLabel(appointment);
        const serviceName = appointment.serviceId?.name || "dịch vụ nha khoa";
        const patientName = appointment.patientId?.fullName || "Bệnh nhân";
        const doctorUserId = appointment.doctorId?.userId?._id || appointment.doctorId?.userId;

        if (appointment.patientId?._id) {
            tasks.push(createNotification(
                appointment.patientId._id,
                "appointment",
                "Lịch hẹn đã quá hạn",
                `Lịch hẹn ${serviceName} lúc ${appointmentLabel} đã quá hạn và được hệ thống tự động huỷ. Vui lòng đặt lịch mới nếu bạn vẫn cần khám.`
            ));
        }

        if (doctorUserId) {
            tasks.push(createNotification(
                doctorUserId,
                "appointment",
                "Một lịch hẹn đã quá hạn",
                `Lịch hẹn của ${patientName} lúc ${appointmentLabel} đã quá hạn và được hệ thống tự động huỷ.`
            ));
        }

        for (const admin of admins) {
            tasks.push(createNotification(
                admin._id,
                "appointment",
                "Có lịch hẹn quá hạn đã được hệ thống huỷ",
                `Lịch hẹn của ${patientName} lúc ${appointmentLabel} đã quá hạn và được hệ thống tự động huỷ.`
            ));
        }
    }

    const results = await Promise.allSettled(tasks);
    const failedCount = results.filter((result) => result.status === "rejected").length;
    if (failedCount > 0) {
        console.warn(`[ExpiredAppointmentJob] Failed to create ${failedCount} expiry notifications.`);
    }
};

export const expireOverdueAppointments = async () => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const candidates = await Appointment.find({
        status: { $in: EXPIRABLE_STATUSES },
        $or: [
            { appointmentDate: { $lt: now } },
            { date: { $lt: now } },
        ],
    })
        .select("appointmentDate date startTime timeSlot status patientId doctorId serviceId")
        .populate("patientId", "fullName")
        .populate("serviceId", "name")
        .populate({ path: "doctorId", select: "userId", populate: { path: "userId", select: "_id" } });

    const overdue = candidates.filter((appointment) => {
        const dateTime = getAppointmentDateTime(appointment);
        if (dateTime) return dateTime < now;

        const dateValue = appointment.appointmentDate || appointment.date;
        if (!dateValue) return false;
        const dateOnly = new Date(dateValue);
        if (Number.isNaN(dateOnly.getTime())) return false;
        dateOnly.setHours(0, 0, 0, 0);
        return dateOnly < todayStart;
    });

    const overdueIds = overdue.map((appointment) => appointment._id);
    if (overdueIds.length === 0) return;

    await Appointment.updateMany(
        { _id: { $in: overdueIds }, status: { $in: EXPIRABLE_STATUSES } },
        {
            $set: {
                status: "cancelled",
                cancelReason: "Hệ thống tự động huỷ do lịch hẹn đã quá hạn",
                cancelledBy: "system",
                cancelledAt: now,
            },
        }
    );

    await createExpiryNotifications(overdue);

    emitPublic("appointment:changed", {
        action: "expired-bulk",
        count: overdueIds.length,
        appointmentIds: overdueIds.map((id) => id.toString()),
    });
    emitPublic("slots:changed", {
        action: "expired-bulk",
        count: overdueIds.length,
    });

    console.log(`[ExpiredAppointmentJob] Auto-cancelled ${overdue.length} overdue appointments.`);
};

cron.schedule("*/15 * * * *", () => {
    expireOverdueAppointments().catch((err) => {
        console.error("[ExpiredAppointmentJob] Error:", err.message);
    });
}, { timezone: "Asia/Ho_Chi_Minh" });

console.log("[ExpiredAppointmentJob] Initialized — checks every 15 minutes.");
