import cron from "node-cron";
import Appointment from "../modules/appointment/appointment.model.js";
import { emitAppointmentChanged } from "../realtime/socket.js";

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

const getAppointmentDateTime = (appointment) => {
    const dateValue = appointment.appointmentDate || appointment.date;
    const timeValue = appointment.startTime || appointment.timeSlot;
    if (!dateValue || !timeValue) return null;

    const time = parseTimeParts(timeValue);
    if (!time) return null;

    const dateTime = new Date(dateValue);
    if (Number.isNaN(dateTime.getTime())) return null;
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

    for (const appointment of overdue) {
        appointment.status = "cancelled";
        appointment.cancelReason = "Auto-expired";
        appointment.cancelledBy = "system";
        appointment.cancelledAt = now;
        await appointment.save();
        await emitAppointmentChanged(appointment, "expired");
    }

    if (overdue.length > 0) {
        console.log(`[ExpiredAppointmentJob] Auto-cancelled ${overdue.length} overdue appointments.`);
    }
};

cron.schedule("*/15 * * * *", () => {
    expireOverdueAppointments().catch((err) => {
        console.error("[ExpiredAppointmentJob] Error:", err.message);
    });
}, { timezone: "Asia/Ho_Chi_Minh" });

console.log("[ExpiredAppointmentJob] Initialized — checks every 15 minutes.");
