import cron from "node-cron";
import Appointment from "../modules/appointment/appointment.model.js";
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
    }).select("appointmentDate date startTime timeSlot status");

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
                cancelReason: "Auto-expired",
                cancelledBy: "system",
                cancelledAt: now,
            },
        }
    );

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
