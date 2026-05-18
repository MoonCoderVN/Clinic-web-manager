import Schedule from "./schedule.model.js";
import Doctor from "../doctor/doctor.model.js";
import Appointment from "../appointment/appointment.model.js";
import Service from "../service/service.model.js";
import apiResponse from "../../utils/apiResponse.js";
import { emitPublic, emitToRole, emitToUser } from "../../realtime/socket.js";
import { filterSlotsByApprovedLeave } from "../leaveRequest/leaveRequest.utils.js";

const ACTIVE_APPOINTMENT_STATUSES = ["pending", "confirmed", "rescheduled", "in_progress"];

const emitScheduleChanged = (action, scheduleOrPayload = {}) => {
    const doctorUserId = scheduleOrPayload.doctorId;
    const payload = {
        action,
        scheduleId: scheduleOrPayload._id?.toString(),
        doctorUserId: doctorUserId?.toString(),
        weekStart: scheduleOrPayload.weekStart,
        dayOfWeek: scheduleOrPayload.dayOfWeek,
    };
    emitToRole("admin", "schedule:changed", payload);
    emitToRole("doctor", "schedule:changed", payload);
    emitToUser(doctorUserId, "schedule:changed", payload);
    emitPublic("slots:changed", payload);
};

const toMinutes = (time) => {
    const [hours, minutes] = String(time || "").split(":").map(Number);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
    return hours * 60 + minutes;
};

const toTimeString = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
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

const isSameLocalDate = (a, b) =>
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();

const getMonday = (date) => {
    const d = new Date(date.getTime());
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, "0");
    const dd = String(monday.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
};

const todayWeekStart = () => getMonday(new Date());

const isPastWeek = (weekStart) => Boolean(weekStart) && weekStart < todayWeekStart();

const blockPastWeekMutation = (res, weekStart) => {
    if (!isPastWeek(weekStart)) return false;
    res.status(400).json({
        success: false,
        message: "Không thể sửa hoặc xoá lịch làm việc của tuần đã qua",
    });
    return true;
};

const applyWeeklyOverrides = (schedules, weekStart) => {
    if (!weekStart) return schedules.filter((schedule) => !schedule.isOff);

    const byDoctorDay = new Map();
    for (const schedule of schedules) {
        const doctorId = (schedule.doctorId?._id || schedule.doctorId)?.toString();
        const key = `${doctorId}:${schedule.dayOfWeek}`;
        const current = byDoctorDay.get(key);
        if (schedule.weekStart === weekStart || !current) {
            byDoctorDay.set(key, schedule);
        }
    }

    return [...byDoctorDay.values()].filter((schedule) => !schedule.isOff);
};

const buildOffOverride = (schedule, weekStart) => ({
    doctorId: schedule.doctorId,
    dayOfWeek: schedule.dayOfWeek,
    startTime: schedule.startTime || "00:00",
    endTime: schedule.endTime || "00:00",
    maxSlots: schedule.maxSlots || 0,
    weekStart,
    isOff: true,
});

const getDoctorProfileForAvailability = async (doctorId) => {
    let doctor = await Doctor.findById(doctorId).populate("userId", "fullName email");
    if (!doctor) {
        doctor = await Doctor.findOne({ userId: doctorId }).populate("userId", "fullName email");
    }
    return doctor;
};

export const computeDoctorAvailability = async ({ doctorId, date, serviceId, durationMinutes = 30 }) => {
    const targetDate = parseLocalDateOnly(date);
    if (!doctorId || !targetDate) {
        return { valid: false, message: "Thiếu doctorId hoặc ngày không hợp lệ" };
    }

    const doctor = await getDoctorProfileForAvailability(doctorId);
    if (!doctor) return { valid: false, message: "Không tìm thấy bác sĩ" };

    let duration = durationMinutes;
    if (serviceId) {
        const service = await Service.findById(serviceId).select("duration");
        duration = service?.duration || duration;
    }

    const dayOfWeek = targetDate.getDay();
    const weekStart = getMonday(targetDate);
    const doctorUserId = doctor.userId?._id || doctor.userId;
    let schedules = await Schedule.find({ doctorId: doctorUserId, dayOfWeek, weekStart }).lean();
    if (schedules.some((schedule) => schedule.isOff)) {
        schedules = [];
    } else if (schedules.length === 0) {
        schedules = await Schedule.find({ doctorId: doctorUserId, dayOfWeek, weekStart: null }).lean();
    }
    schedules = schedules.filter((schedule) => !schedule.isOff);
    if (schedules.length === 0) {
        return {
            valid: true,
            doctorId: doctor._id,
            doctorName: doctor.userId?.fullName || "Bác sĩ",
            date,
            duration,
            availableSlots: [],
            message: "Bác sĩ không có lịch làm việc trong ngày này",
        };
    }

    const dayStart = new Date(targetDate);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);
    const appointments = await Appointment.find({
        doctorId: doctor._id,
        $or: [
            { appointmentDate: { $gte: dayStart, $lte: dayEnd } },
            { date: { $gte: dayStart, $lte: dayEnd } },
        ],
        status: { $in: ACTIVE_APPOINTMENT_STATUSES },
    }).select("startTime endTime timeSlot").lean();

    const occupied = appointments.map((appointment) => {
        const start = toMinutes(appointment.startTime || appointment.timeSlot);
        const end = toMinutes(appointment.endTime) ?? (start === null ? null : start + duration);
        return { start, end };
    }).filter((slot) => slot.start !== null && slot.end !== null);

    const availableSlots = [];
    const now = new Date();
    const minStartMinutes = isSameLocalDate(targetDate, now)
        ? now.getHours() * 60 + now.getMinutes()
        : 0;
    for (const schedule of schedules) {
        const workStart = toMinutes(schedule.startTime);
        const workEnd = toMinutes(schedule.endTime);
        if (workStart === null || workEnd === null || workEnd <= workStart) continue;

        const maxSlots = Number(schedule.maxSlots);
        if (Number.isFinite(maxSlots)) {
            const bookedInSchedule = occupied.filter((slot) => slot.start < workEnd && slot.end > workStart).length;
            if (bookedInSchedule >= maxSlots) continue;
        }

        for (let cursor = workStart; cursor + duration <= workEnd; cursor += duration) {
            if (cursor < minStartMinutes) continue;
            const slotEnd = cursor + duration;
            const hasConflict = occupied.some((slot) => cursor < slot.end && slotEnd > slot.start);
            if (!hasConflict) {
                availableSlots.push({
                    startTime: toTimeString(cursor),
                    endTime: toTimeString(slotEnd),
                });
            }
        }
    }

    const availableSlotsAfterLeave = await filterSlotsByApprovedLeave(availableSlots, doctorUserId, date);

    return {
        valid: true,
        doctorId: doctor._id,
        doctorUserId,
        doctorName: doctor.userId?.fullName || "Bác sĩ",
        date,
        duration,
        availableSlots: availableSlotsAfterLeave,
        message: availableSlotsAfterLeave.length > 0 ? "Có lịch trống" : "Không còn lịch trống trong ngày này",
    };
};

export const getSchedules = async (req, res, next) => {
    try {
        const weekStart = String(req.query.weekStart || "").trim();
        let query = { doctorId: req.params.doctorId };
        
        if (weekStart) {
            query.$or = [{ weekStart: weekStart }, { weekStart: null }];
        } else {
            query.weekStart = null;
        }

        const schedules = applyWeeklyOverrides(await Schedule.find(query), weekStart);
        return apiResponse(res, 200, "Schedules retrieved", schedules);
    } catch (error) {
        next(error);
    }
};

// Admin only: Get all schedules (supports week filter)
export const getAllSchedules = async (req, res, next) => {
    try {
        const weekStart = String(req.query.weekStart || "").trim();
        let query = {};
        
        if (weekStart) {
            query.$or = [{ weekStart: weekStart }, { weekStart: null }];
        } else {
            query.weekStart = null;
        }

        const schedules = applyWeeklyOverrides(await Schedule.find(query), weekStart);
        return apiResponse(res, 200, "All schedules retrieved", schedules);
    } catch (error) {
        next(error);
    }
};

export const getAvailability = async (req, res, next) => {
    try {
        const { doctorId, date, serviceId } = req.query;
        const result = await computeDoctorAvailability({ doctorId, date, serviceId });
        if (!result.valid) {
            return res.status(400).json({ success: false, message: result.message });
        }
        return apiResponse(res, 200, "Availability retrieved", result);
    } catch (error) {
        next(error);
    }
};

export const createSchedule = async (req, res, next) => {
    try {
        // Nếu admin truyền doctorId qua body → dùng đó; ngược lại lấy từ req.user.id (doctor tự tạo)
        const targetUserId = (req.user.role === "admin" && req.body.doctorId)
            ? req.body.doctorId
            : req.user.id;

        const { doctorId: _ignored, ...scheduleData } = req.body;
        scheduleData.weekStart = scheduleData.weekStart || null;
        if (blockPastWeekMutation(res, scheduleData.weekStart)) return;

        if (scheduleData.startTime && scheduleData.endTime && scheduleData.startTime >= scheduleData.endTime) {
            return res.status(400).json({ success: false, message: "Giờ bắt đầu phải trước giờ kết thúc" });
        }

        const schedule = await Schedule.findOneAndUpdate(
            { doctorId: targetUserId, dayOfWeek: scheduleData.dayOfWeek, weekStart: scheduleData.weekStart },
            { ...scheduleData, doctorId: targetUserId, isOff: false },
            { new: true, upsert: true, runValidators: true }
        );
        emitScheduleChanged("created", schedule);
        return apiResponse(res, 201, "Schedule created", schedule);
    } catch (error) {
        next(error);
    }
};

export const updateSchedule = async (req, res, next) => {
    try {
        const existingSchedule = await Schedule.findById(req.params.id);
        if (!existingSchedule) {
            return res.status(404).json({ success: false, message: "Schedule not found" });
        }

        const effectiveWeekStart = req.query.weekStart || req.body.weekStart || existingSchedule.weekStart;
        if (!effectiveWeekStart) {
            return res.status(400).json({ success: false, message: "Bắt buộc phải chọn tuần" });
        }
        if (blockPastWeekMutation(res, effectiveWeekStart)) return;

        const startTime = req.body.startTime ?? existingSchedule.startTime;
        const endTime = req.body.endTime ?? existingSchedule.endTime;
        if (startTime && endTime && startTime >= endTime) {
            return res.status(400).json({ success: false, message: "Giờ bắt đầu phải trước giờ kết thúc" });
        }

        const payload = {
            ...req.body,
            doctorId: existingSchedule.doctorId,
            dayOfWeek: req.body.dayOfWeek ?? existingSchedule.dayOfWeek,
            weekStart: effectiveWeekStart,
            isOff: false,
        };

        const schedule = existingSchedule.weekStart
            ? await Schedule.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
            : await Schedule.findOneAndUpdate(
                { doctorId: existingSchedule.doctorId, dayOfWeek: existingSchedule.dayOfWeek, weekStart: effectiveWeekStart },
                payload,
                { new: true, upsert: true, runValidators: true }
            );

        emitScheduleChanged("updated", schedule);
        return apiResponse(res, 200, "Schedule updated", schedule);
    } catch (error) {
        next(error);
    }
};

export const deleteSchedule = async (req, res, next) => {
    try {
        const schedule = await Schedule.findById(req.params.id);
        if (!schedule) {
            return apiResponse(res, 200, "Schedule deleted");
        }

        const effectiveWeekStart = req.query.weekStart || schedule.weekStart;
        if (!effectiveWeekStart) {
            return res.status(400).json({ success: false, message: "Bắt buộc phải chọn tuần" });
        }
        if (blockPastWeekMutation(res, effectiveWeekStart)) return;

        const offSchedule = await Schedule.findOneAndUpdate(
            { doctorId: schedule.doctorId, dayOfWeek: schedule.dayOfWeek, weekStart: effectiveWeekStart },
            buildOffOverride(schedule, effectiveWeekStart),
            { new: true, upsert: true, runValidators: true }
        );

        emitScheduleChanged("deleted", offSchedule);
        return apiResponse(res, 200, "Schedule deleted");
    } catch (error) {
        next(error);
    }
};

// Admin only: Bulk create/update schedules for multiple doctors and days
export const bulkCreateSchedules = async (req, res, next) => {
    try {
        const { doctorIds, days, startTime, endTime, maxSlots, weekStart, weekStarts } = req.body;
        const targetWeekStarts = Array.isArray(weekStarts) && weekStarts.length > 0 ? weekStarts : [weekStart];

        if (!doctorIds || !days || !startTime || !endTime || targetWeekStarts.some((targetWeekStart) => !targetWeekStart)) {
            return res.status(400).json({ success: false, message: "Missing required fields (including weekStart)" });
        }
        if (targetWeekStarts.some((targetWeekStart) => isPastWeek(targetWeekStart))) {
            return res.status(400).json({
                success: false,
                message: "Không thể gán lịch cho tuần đã qua",
            });
        }

        const results = [];

        for (const doctorId of doctorIds) {
            for (const dayOfWeek of days) {
                for (const targetWeekStart of targetWeekStarts) {
                    const schedule = await Schedule.findOneAndUpdate(
                        { doctorId, dayOfWeek, weekStart: targetWeekStart },
                        {
                            doctorId,
                            dayOfWeek,
                            startTime,
                            endTime,
                            maxSlots: maxSlots || 10,
                            weekStart: targetWeekStart,
                            isOff: false,
                        },
                        { new: true, upsert: true, runValidators: true }
                    );
                    results.push(schedule);
                    emitScheduleChanged("bulk-upserted", schedule);
                }
            }
        }

        return apiResponse(res, 201, `Successfully created ${results.length} schedule entries`, results);
    } catch (error) {
        next(error);
    }
};
