import cron from "node-cron";
import Appointment from "../modules/appointment/appointment.model.js";
import User from "../modules/user/user.model.js";
import { createNotification } from "../modules/notification/notification.service.js";
import { emitPublic } from "../realtime/socket.js";

const EXPIRABLE_STATUSES = ["pending", "confirmed", "rescheduled"];
const STALE_IN_PROGRESS_MS = 4 * 60 * 60 * 1000;

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

const populateAppointmentQuery = (query) =>
    query
        .select("appointmentDate date startTime timeSlot status patientId doctorId serviceId")
        .populate("patientId", "fullName")
        .populate("serviceId", "name")
        .populate({ path: "doctorId", select: "userId", populate: { path: "userId", select: "_id" } });

const createCancellationNotifications = async (appointments, mode = "expired") => {
    if (!appointments.length) return;

    const admins = await User.find({ role: "admin" }).select("_id").lean();
    const tasks = [];
    const isStaleInProgress = mode === "stale-in-progress";

    for (const appointment of appointments) {
        const appointmentLabel = formatAppointmentLabel(appointment);
        const serviceName = appointment.serviceId?.name || "dịch vụ nha khoa";
        const patientName = appointment.patientId?.fullName || "Bệnh nhân";
        const doctorUserId = appointment.doctorId?.userId?._id || appointment.doctorId?.userId;
        const patientTitle = isStaleInProgress ? "Ca khám đã bị hệ thống huỷ" : "Lịch hẹn đã quá hạn";
        const staffTitle = isStaleInProgress ? "Ca khám bị treo đã được hệ thống huỷ" : "Một lịch hẹn đã quá hạn";
        const adminTitle = isStaleInProgress
            ? "Có ca khám bị treo đã được hệ thống huỷ"
            : "Có lịch hẹn quá hạn đã được hệ thống huỷ";
        const patientMessage = isStaleInProgress
            ? `Ca khám ${serviceName} lúc ${appointmentLabel} bị treo quá lâu và được hệ thống tự động huỷ. Vui lòng liên hệ phòng khám nếu cần hỗ trợ.`
            : `Lịch hẹn ${serviceName} lúc ${appointmentLabel} đã quá hạn và được hệ thống tự động huỷ. Vui lòng đặt lịch mới nếu bạn vẫn cần khám.`;
        const staffMessage = isStaleInProgress
            ? `Ca khám của ${patientName} lúc ${appointmentLabel} bị treo quá lâu và được hệ thống tự động huỷ.`
            : `Lịch hẹn của ${patientName} lúc ${appointmentLabel} đã quá hạn và được hệ thống tự động huỷ.`;

        if (appointment.patientId?._id) {
            tasks.push(createNotification(appointment.patientId._id, "appointment", patientTitle, patientMessage));
        }

        if (doctorUserId) {
            tasks.push(createNotification(doctorUserId, "appointment", staffTitle, staffMessage));
        }

        for (const admin of admins) {
            tasks.push(createNotification(admin._id, "appointment", adminTitle, staffMessage));
        }
    }

    const results = await Promise.allSettled(tasks);
    const failedCount = results.filter((result) => result.status === "rejected").length;
    if (failedCount > 0) {
        console.warn(`[ExpiredAppointmentJob] Failed to create ${failedCount} cancellation notifications.`);
    }
};

const emitBulkAppointmentCancellation = (action, appointmentIds) => {
    emitPublic("appointment:changed", {
        action,
        count: appointmentIds.length,
        appointmentIds: appointmentIds.map((id) => id.toString()),
    });
    emitPublic("slots:changed", {
        action,
        count: appointmentIds.length,
    });
};

export const expireOverdueAppointments = async () => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const candidates = await populateAppointmentQuery(Appointment.find({
        status: { $in: EXPIRABLE_STATUSES },
        $or: [
            { appointmentDate: { $lt: now } },
            { date: { $lt: now } },
        ],
    }));

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
    if (overdueIds.length > 0) {
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

        await createCancellationNotifications(overdue, "expired");
        emitBulkAppointmentCancellation("expired-bulk", overdueIds);
        console.log(`[ExpiredAppointmentJob] Auto-cancelled ${overdue.length} overdue appointments.`);
    }

    const staleCandidates = await populateAppointmentQuery(Appointment.find({
        status: "in_progress",
        $or: [
            { appointmentDate: { $lt: now } },
            { date: { $lt: now } },
        ],
    }));

    const staleInProgress = staleCandidates.filter((appointment) => {
        const dateTime = getAppointmentDateTime(appointment);
        return dateTime ? dateTime.getTime() + STALE_IN_PROGRESS_MS < now.getTime() : false;
    });

    const staleIds = staleInProgress.map((appointment) => appointment._id);
    if (staleIds.length > 0) {
        await Appointment.updateMany(
            { _id: { $in: staleIds }, status: "in_progress" },
            {
                $set: {
                    status: "cancelled",
                    cancelReason: "Hệ thống tự động huỷ do ca khám bị treo quá lâu",
                    cancelledBy: "system",
                    cancelledAt: now,
                },
            }
        );

        await createCancellationNotifications(staleInProgress, "stale-in-progress");
        emitBulkAppointmentCancellation("stale-in-progress-cancelled", staleIds);
        console.log(`[ExpiredAppointmentJob] Auto-cancelled ${staleIds.length} stale in-progress appointments.`);
    }
};

cron.schedule("*/15 * * * *", () => {
    expireOverdueAppointments().catch((err) => {
        console.error("[ExpiredAppointmentJob] Error:", err.message);
    });
}, { timezone: "Asia/Ho_Chi_Minh" });

console.log("[ExpiredAppointmentJob] Initialized - checks every 15 minutes.");
