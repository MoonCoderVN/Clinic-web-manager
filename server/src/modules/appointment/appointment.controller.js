import Appointment from "./appointment.model.js";
import Doctor from "../doctor/doctor.model.js";
import Schedule from "../schedule/schedule.model.js";
import Service from "../service/service.model.js";
import User from "../user/user.model.js";
import apiResponse from "../../utils/apiResponse.js";
import { createNotification } from "../notification/notification.service.js";
import { isDoctorOffOnDate } from "../leaveRequest/leaveRequest.utils.js";
import { sendEmail } from "../../utils/sendEmail.js";
import { appointmentBookedTemplate, appointmentConfirmedTemplate } from "../../utils/emailTemplates.js";
import { emitAppointmentChanged } from "../../realtime/socket.js";

const CHECK_IN_WINDOW_BEFORE_MS = 30 * 60 * 1000;
const CHECK_IN_WINDOW_AFTER_MS = 60 * 60 * 1000;
const CONFIRM_GRACE_MS = 15 * 60 * 1000;
const ACTIVE_APPOINTMENT_STATUSES = ["pending", "confirmed", "rescheduled", "in_progress"];

const parseTimeParts = (value) => {
    const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

    return { hours, minutes, totalMinutes: hours * 60 + minutes };
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

const buildAppointmentDateTime = (dateValue, timeValue) => {
    const date = parseLocalDateOnly(dateValue);
    const time = parseTimeParts(timeValue);
    if (!date || !time) return null;

    const dateTime = new Date(date);
    dateTime.setHours(time.hours, time.minutes, 0, 0);
    return { date, dateTime, time };
};

const validateAppointmentDateTime = (dateValue, timeValue, { minHoursFromNow = 0 } = {}) => {
    const parsed = buildAppointmentDateTime(dateValue, timeValue);
    if (!parsed) return { valid: false, message: "Ngày hoặc giờ hẹn không hợp lệ" };

    const minimumDateTime = new Date(Date.now() + minHoursFromNow * 60 * 60 * 1000);
    if (parsed.dateTime < minimumDateTime) {
        return {
            valid: false,
            message: minHoursFromNow > 0
                ? `Không thể chọn lịch trong vòng ${minHoursFromNow} giờ tới`
                : "Không thể chọn thời điểm đã qua",
        };
    }

    return { valid: true, ...parsed };
};

// Helper: lấy Monday của tuần chứa date (format YYYY-MM-DD)
const getMonday = (date) => {
    const d = new Date(date.getTime());
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    const y = mon.getFullYear();
    const m = String(mon.getMonth() + 1).padStart(2, "0");
    const dd = String(mon.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
};

// ──────────────────────────────────────────────────────────────────
// Utility: calculate endTime given startTime (HH:MM) + duration (min)
// ──────────────────────────────────────────────────────────────────
const calculateEndTime = (startTime, durationMinutes) => {
    const start = parseTimeParts(startTime);
    if (!start) return null;
    const totalMin = start.totalMinutes + durationMinutes;
    const endH = Math.floor(totalMin / 60);
    const endM = totalMin % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
};

// ──────────────────────────────────────────────────────────────────
// Utility: check if a new slot conflicts with existing appointments
// ──────────────────────────────────────────────────────────────────
const checkSlotConflict = async (doctorId, date, startTime, endTime, excludeId = null) => {
    const dayStart = parseLocalDateOnly(date);
    if (!dayStart) throw new Error("Invalid date format");
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const filter = {
        doctorId,
        $or: [
            { appointmentDate: { $gte: dayStart, $lte: dayEnd } },
            { date: { $gte: dayStart, $lte: dayEnd } },
        ],
        status: { $nin: ["cancelled"] },
    };
    if (excludeId) filter._id = { $ne: excludeId };

    const existing = await Appointment.find(filter).select("startTime endTime timeSlot");

    const newStartParts = parseTimeParts(startTime);
    const newEndParts = parseTimeParts(endTime);
    if (!newStartParts || !newEndParts) throw new Error("Invalid time format");
    const newStart = newStartParts.totalMinutes;
    const newEnd = newEndParts.totalMinutes;

    for (const appt of existing) {
        const apptStart = appt.startTime || appt.timeSlot;
        const apptEnd = appt.endTime;
        if (!apptStart) continue;

        const existingStart = parseTimeParts(apptStart);
        if (!existingStart) continue;
        const aStart = existingStart.totalMinutes;
        let aEnd = aStart + 30; // default 30min
        if (apptEnd) {
            const existingEnd = parseTimeParts(apptEnd);
            if (existingEnd) aEnd = existingEnd.totalMinutes;
        }

        if (newStart < aEnd && newEnd > aStart) return true; // conflict
    }
    return false;
};

const checkScheduleCapacity = async (doctorId, date, scheduleEntry, excludeId = null) => {
    const maxSlots = Number(scheduleEntry?.maxSlots);
    if (!Number.isFinite(maxSlots)) return { valid: true };
    if (maxSlots <= 0) return { valid: false, message: "Ca làm việc này không còn nhận thêm lịch hẹn" };

    const dayStart = parseLocalDateOnly(date);
    const workStart = parseTimeParts(scheduleEntry.startTime)?.totalMinutes;
    const workEnd = parseTimeParts(scheduleEntry.endTime)?.totalMinutes;
    if (!dayStart || workStart === undefined || workEnd === undefined) return { valid: true };

    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const filter = {
        doctorId,
        $or: [
            { appointmentDate: { $gte: dayStart, $lte: dayEnd } },
            { date: { $gte: dayStart, $lte: dayEnd } },
        ],
        status: { $in: ACTIVE_APPOINTMENT_STATUSES },
    };
    if (excludeId) filter._id = { $ne: excludeId };

    const appointments = await Appointment.find(filter).select("startTime endTime timeSlot").lean();
    const bookedInSchedule = appointments.filter((appointment) => {
        const start = parseTimeParts(appointment.startTime || appointment.timeSlot)?.totalMinutes;
        const end = parseTimeParts(appointment.endTime)?.totalMinutes ?? (start === undefined ? null : start + 30);
        if (start === undefined || end === null) return false;
        return start < workEnd && end > workStart;
    }).length;

    if (bookedInSchedule >= maxSlots) {
        return { valid: false, message: "Ca làm việc này đã đạt số lượng lịch hẹn tối đa" };
    }
    return { valid: true };
};

const getAppointmentDateTime = (appointment) => {
    const apptTime = appointment?.startTime || appointment?.timeSlot;
    const apptDate = appointment?.appointmentDate || appointment?.date;
    return buildAppointmentDateTime(apptDate, apptTime)?.dateTime || null;
};

const ensurePatientCanModifyAppointment = (appointment, action = "thực hiện thao tác") => {
    const apptDateTime = getAppointmentDateTime(appointment);
    if (!apptDateTime) return null;

    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
    if (apptDateTime < twoHoursFromNow) {
        return `Không thể ${action} trong vòng 2 giờ trước khi khám. Vui lòng liên hệ phòng khám để được hỗ trợ.`;
    }

    return null;
};

const getObjectIdString = (value) => {
    if (!value) return "";
    return (value._id || value).toString();
};

const canAccessAppointment = async (user, appointment) => {
    if (!user || !appointment) return false;
    if (user.role === "admin") return true;

    if (user.role === "patient") {
        return getObjectIdString(appointment.patientId) === user.id;
    }

    if (user.role === "doctor") {
        const doctorProfile = await Doctor.findOne({ userId: user.id }).select("_id").lean();
        if (!doctorProfile) return false;
        return getObjectIdString(appointment.doctorId) === doctorProfile._id.toString();
    }

    return false;
};

const ensureAppointmentAccess = async (req, appointment) => {
    const allowed = await canAccessAppointment(req.user, appointment);
    if (allowed) return null;
    return { status: 403, message: "Không có quyền thao tác với lịch hẹn này" };
};

// ──────────────────────────────────────────────────────────────────
// Utility: validate giờ đặt có nằm trong ca làm việc của bác sĩ không
// Query Schedule collection (ưu tiên tuần cụ thể → fallback recurring)
// ──────────────────────────────────────────────────────────────────
const validateDoctorSchedule = async (doctor, dateStr, timeStr, durationMin) => {
    const targetDate = parseLocalDateOnly(dateStr);
    if (!targetDate) {
        return { valid: false, message: "Ngày không hợp lệ" };
    }
    const dayOfWeek = targetDate.getDay(); // 0=Sun, 1=Mon ...
    const weekStart = getMonday(targetDate);
    const dayNames = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

    // userId là trường doctorId trong Schedule collection
    const userId = doctor.userId?._id || doctor.userId;
    if (!userId) {
        return { valid: false, message: "Bác sĩ chưa được thiết lập tài khoản" };
    }

    // Ưu tiên: tuần cụ thể trước, fallback recurring (weekStart: null)
    let scheduleEntry = await Schedule.findOne({
        doctorId: userId,
        dayOfWeek,
        weekStart, // specific week
    });

    if (!scheduleEntry) {
        scheduleEntry = await Schedule.findOne({
            doctorId: userId,
            dayOfWeek,
            weekStart: null, // recurring default
        });
    }

    if (!scheduleEntry || scheduleEntry.isOff || !scheduleEntry.startTime || !scheduleEntry.endTime) {
        return {
            valid: false,
            message: `Bác sĩ không có ca làm việc vào ${dayNames[dayOfWeek]}`,
        };
    }

    const reqStart = parseTimeParts(timeStr)?.totalMinutes;
    const reqEnd = reqStart + durationMin;
    const workStart = parseTimeParts(scheduleEntry.startTime)?.totalMinutes;
    const workEnd = parseTimeParts(scheduleEntry.endTime)?.totalMinutes;

    if (reqStart === undefined || workStart === undefined || workEnd === undefined) {
        return { valid: false, message: "Giờ đặt hoặc ca làm việc không hợp lệ" };
    }

    if (reqStart < workStart || reqEnd > workEnd) {
        return {
            valid: false,
            message: `Giờ đặt nằm ngoài ca làm việc của bác sĩ (${scheduleEntry.startTime} – ${scheduleEntry.endTime})`,
        };
    }

    const blockedByLeave = await isDoctorOffOnDate(userId, targetDate);
    if (blockedByLeave) {
        return { valid: false, message: "Bác sĩ đã nghỉ vào ngày này, vui lòng chọn ngày hoặc bác sĩ khác" };
    }

    return { valid: true, scheduleEntry };
};

// ──────────────────────────────────────────────────────────────────
// POST /appointments — Create appointment
// ──────────────────────────────────────────────────────────────────
export const createAppointment = async (req, res, next) => {
    try {
        const { serviceId, doctorId, appointmentDate, startTime, date, timeSlot, note, notes } = req.body;

        // Support both old and new field names
        const effectiveDate = appointmentDate || date;
        const effectiveTime = startTime || timeSlot;

        if (!serviceId || !doctorId || !effectiveDate || !effectiveTime) {
            return res.status(400).json({ success: false, message: "Vui lòng cung cấp đầy đủ thông tin" });
        }

        const dateTimeCheck = validateAppointmentDateTime(effectiveDate, effectiveTime);
        if (!dateTimeCheck.valid) {
            return res.status(400).json({ success: false, message: dateTimeCheck.message });
        }

        // Get service duration for endTime
        const service = await Service.findById(serviceId);
        const duration = service?.duration || 30;
        const endTime = calculateEndTime(effectiveTime, duration);
        if (!endTime) {
            return res.status(400).json({ success: false, message: "Giờ hẹn không hợp lệ" });
        }

        // ── VALIDATE: bác sĩ có làm việc ngày/giờ này không? ──
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ success: false, message: "Không tìm thấy bác sĩ" });
        }
        const scheduleCheck = await validateDoctorSchedule(doctor, effectiveDate, effectiveTime, duration);
        if (!scheduleCheck.valid) {
            return res.status(400).json({ success: false, message: scheduleCheck.message });
        }
        const capacityCheck = await checkScheduleCapacity(doctorId, effectiveDate, scheduleCheck.scheduleEntry);
        if (!capacityCheck.valid) {
            return res.status(409).json({ success: false, message: capacityCheck.message });
        }

        // Check conflict với appointment đã tồn tại
        const hasConflict = await checkSlotConflict(doctorId, effectiveDate, effectiveTime, endTime);
        if (hasConflict) {
            return res.status(409).json({ success: false, message: "Khung giờ này đã có lịch hẹn khác" });
        }

        const appointmentData = {
            patientId: req.user.id,
            doctorId,
            serviceId,
            appointmentDate: dateTimeCheck.date,
            startTime: effectiveTime,
            endTime,
            notes: note || notes || "",
            status: "pending",
        };

        const appointment = await Appointment.create(appointmentData);

        // Send notification to patient
        await createNotification(
            req.user.id,
            "appointment",
            "Đặt lịch thành công",
            `Lịch hẹn của bạn vào ${effectiveTime} ngày ${dateTimeCheck.date.toLocaleDateString("vi-VN")} đã được đặt. Chờ xác nhận từ phòng khám.`
        );

        try {
            const appointmentDateLabel = dateTimeCheck.date.toLocaleDateString("vi-VN");
            const patientUserForNotification = await User.findById(req.user.id).select("fullName");
            const doctorUserForNotification = doctor.userId
                ? await User.findById(doctor.userId).select("fullName")
                : null;
            const patientName = patientUserForNotification?.fullName || "B\u1ec7nh nh\u00e2n";
            const doctorName = doctorUserForNotification?.fullName || "B\u00e1c s\u0129";
            const serviceName = service?.name || "d\u1ecbch v\u1ee5 nha khoa";

            if (doctor.userId) {
                await createNotification(
                    doctor.userId,
                    "appointment",
                    "C\u00f3 l\u1ecbch h\u1eb9n m\u1edbi",
                    `${patientName} \u0111\u1eb7t l\u1ecbch ${serviceName} l\u00fac ${effectiveTime} ng\u00e0y ${appointmentDateLabel}.`
                );
            }

            const admins = await User.find({ role: "admin" }).select("_id");
            await Promise.all(admins.map((admin) => createNotification(
                admin._id,
                "appointment",
                "L\u1ecbch h\u1eb9n m\u1edbi c\u1ea7n x\u00e1c nh\u1eadn",
                `${patientName} \u0111\u1eb7t l\u1ecbch v\u1edbi ${doctorName} l\u00fac ${effectiveTime} ng\u00e0y ${appointmentDateLabel}.`
            )));
        } catch (notificationErr) {
            console.error("Create appointment notification failed:", notificationErr.message);
        }

        // Send confirmation email to patient
        try {
            const patientUser = await User.findById(req.user.id).select("email fullName");
            if (patientUser?.email) {
                const doctorUser = doctor.userId
                    ? await User.findById(doctor.userId).select("fullName")
                    : null;
                const bookingUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/patient/appointments`;
                const { subject, html } = appointmentBookedTemplate({
                    patientName: patientUser.fullName || "Bệnh nhân",
                    serviceName: service?.name || "Dịch vụ nha khoa",
                    doctorName: doctorUser?.fullName || "Bác sĩ",
                    dateStr: dateTimeCheck.date.toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
                    timeStr: effectiveTime,
                    bookingUrl,
                });
                await sendEmail(patientUser.email, subject, html);
            }
        } catch (emailErr) {
            console.error("Email gửi không thành công (đặt lịch):", emailErr.message);
        }

        await emitAppointmentChanged(appointment, "created");
        return apiResponse(res, 201, "Đặt lịch thành công", appointment);
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// GET /appointments — Get appointments (patient sees own, doctor sees theirs)
// ──────────────────────────────────────────────────────────────────
export const getMyAppointments = async (req, res, next) => {
    try {
        const { status } = req.query;
        let filter = {};

        if (req.user.role === "patient") {
            filter.patientId = req.user.id;
        } else if (req.user.role === "doctor") {
            // Find the doctor profile by userId (Doctor already imported at top)
            const doctorProfile = await Doctor.findOne({ userId: req.user.id });
            if (doctorProfile) {
                filter.doctorId = doctorProfile._id;
            } else {
                filter.doctorId = req.user.id; // fallback
            }
        }

        if (status && status !== "all") filter.status = status;

        const appointments = await Appointment.find(filter)
            .populate("patientId", "fullName phone email avatar")
            .populate({ path: "doctorId", populate: { path: "userId", select: "fullName email phone avatar" } })
            .populate("serviceId", "name price duration")
            .sort({ appointmentDate: -1, date: -1, createdAt: -1 });

        return apiResponse(res, 200, "Lấy danh sách lịch hẹn thành công", appointments);
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// GET /appointments/:id — Get single appointment
// ──────────────────────────────────────────────────────────────────
export const getAppointmentById = async (req, res, next) => {
    try {
        const appointment = await Appointment.findById(req.params.id)
            .populate("patientId", "fullName phone email")
            .populate({ path: "doctorId", populate: { path: "userId", select: "fullName email phone" } })
            .populate("serviceId", "name description price duration");
        if (!appointment) return res.status(404).json({ success: false, message: "Không tìm thấy lịch hẹn" });
        const accessError = await ensureAppointmentAccess(req, appointment);
        if (accessError) {
            return res.status(accessError.status).json({ success: false, message: accessError.message });
        }
        return apiResponse(res, 200, "Lấy thông tin lịch hẹn thành công", appointment);
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// PUT /appointments/:id/reschedule — Reschedule appointment
// ──────────────────────────────────────────────────────────────────
export const rescheduleAppointment = async (req, res, next) => {
    try {
        const { newDate, newTime } = req.body;
        if (!newDate || !newTime) {
            return res.status(400).json({ success: false, message: "Vui lòng cung cấp ngày và giờ mới" });
        }

        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ success: false, message: "Không tìm thấy lịch hẹn" });

        const accessError = await ensureAppointmentAccess(req, appointment);
        if (accessError) {
            return res.status(accessError.status).json({ success: false, message: accessError.message });
        }

        // Status check
        if (["completed", "cancelled"].includes(appointment.status)) {
            return res.status(400).json({
                success: false,
                message: `Không thể đổi lịch vì trạng thái hiện tại là "${appointment.status}"`,
            });
        }

        if (req.user.role === "patient") {
            const timeRuleMessage = ensurePatientCanModifyAppointment(appointment, "đổi lịch");
            if (timeRuleMessage) {
                return res.status(400).json({ success: false, message: timeRuleMessage });
            }
        }

        const dateTimeCheck = validateAppointmentDateTime(newDate, newTime, {
            minHoursFromNow: req.user.role === "patient" ? 2 : 0,
        });
        if (!dateTimeCheck.valid) {
            return res.status(400).json({ success: false, message: dateTimeCheck.message });
        }

        // Get service duration
        const service = await Service.findById(appointment.serviceId);
        const duration = service?.duration || 30;
        const newEndTime = calculateEndTime(newTime, duration);
        if (!newEndTime) {
            return res.status(400).json({ success: false, message: "Giờ mới không hợp lệ" });
        }

        // ── VALIDATE: bác sĩ có làm việc vào ngày/giờ mới không? ──
        const doctor = await Doctor.findById(appointment.doctorId);
        if (doctor) {
            const scheduleCheck = await validateDoctorSchedule(doctor, newDate, newTime, duration);
            if (!scheduleCheck.valid) {
                return res.status(400).json({ success: false, message: scheduleCheck.message });
            }
            const capacityCheck = await checkScheduleCapacity(appointment.doctorId, newDate, scheduleCheck.scheduleEntry, appointment._id);
            if (!capacityCheck.valid) {
                return res.status(409).json({ success: false, message: capacityCheck.message });
            }
        }

        // Check for slot conflicts
        const hasConflict = await checkSlotConflict(
            appointment.doctorId,
            newDate,
            newTime,
            newEndTime,
            appointment._id
        );
        if (hasConflict) {
            return res.status(409).json({ success: false, message: "Khung giờ mới đã có lịch hẹn khác" });
        }

        appointment.appointmentDate = dateTimeCheck.date;
        appointment.startTime = newTime;
        appointment.endTime = newEndTime;
        appointment.status = "rescheduled";
        await appointment.save();

        // Notify patient: xác nhận đổi lịch
        await createNotification(
            appointment.patientId,
            "appointment",
            "Đổi lịch thành công",
            `Lịch hẹn của bạn đã được dời sang ${newTime} ngày ${dateTimeCheck.date.toLocaleDateString("vi-VN")}. Chờ phòng khám xác nhận lại.`
        );

        // Notify doctor: cần xác nhận lại lịch đổi
        const doctorProfile = await Doctor.findById(appointment.doctorId);
        if (doctorProfile?.userId) {
            await createNotification(
                doctorProfile.userId,
                "appointment",
                "Bệnh nhân đổi lịch — cần xác nhận lại",
                `Một lịch hẹn đã được bệnh nhân dời sang ${newTime} ngày ${dateTimeCheck.date.toLocaleDateString("vi-VN")}. Vui lòng xác nhận lại.`
            );
        }

        const admins = await User.find({ role: "admin" }).select("_id");
        await Promise.all(admins.map((admin) => createNotification(
            admin._id,
            "appointment",
            "Lịch hẹn đã được đổi - cần xác nhận lại",
            `Một lịch hẹn đã được dời sang ${newTime} ngày ${dateTimeCheck.date.toLocaleDateString("vi-VN")}. Vui lòng kiểm tra và xác nhận lại.`
        )));

        await emitAppointmentChanged(appointment, "rescheduled");
        return apiResponse(res, 200, "Đổi lịch thành công", appointment);
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// PATCH /appointments/:id/cancel — Cancel appointment (legacy route)
// DELETE /appointments/:id — Cancel appointment (new route)
// ──────────────────────────────────────────────────────────────────
export const cancelAppointment = async (req, res, next) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ success: false, message: "Không tìm thấy lịch hẹn" });

        const accessError = await ensureAppointmentAccess(req, appointment);
        if (accessError) {
            return res.status(accessError.status).json({ success: false, message: accessError.message });
        }

        // Status check
        if (["completed", "cancelled"].includes(appointment.status)) {
            return res.status(400).json({
                success: false,
                message: `Không thể hủy vì lịch hẹn đã ở trạng thái "${appointment.status}"`,
            });
        }

        // Time check: patient không thể cancel trong vòng 2 giờ (admin/doctor không bị hạn chế)
        if (req.user.role === "patient") {
            const apptDateTime = getAppointmentDateTime(appointment);
            if (apptDateTime) {
                const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
                if (apptDateTime < twoHoursFromNow) {
                    return res.status(400).json({
                        success: false,
                        message: "Không thể hủy lịch trong vòng 2 giờ trước khi khám",
                    });
                }
            }
        }

        const reason = req.body?.reason || "";
        appointment.status = "cancelled";
        appointment.cancelReason = reason;
        appointment.cancelledBy = req.user.role;
        appointment.cancelledAt = new Date();
        await appointment.save();

        // Send notification to patient
        await createNotification(
            appointment.patientId,
            "appointment",
            "Lịch hẹn đã bị hủy",
            `Lịch hẹn của bạn đã bị hủy. ${reason ? "Lý do: " + reason : ""}`
        );

        await emitAppointmentChanged(appointment, "cancelled");
        return apiResponse(res, 200, "Hủy lịch thành công", appointment);
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// PATCH /appointments/:id/complete — Mark as completed (doctor/admin)
// Chỉ hoàn thành được khi đang in_progress hoặc confirmed
// ──────────────────────────────────────────────────────────────────
export const completeAppointment = async (req, res, next) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ success: false, message: "Không tìm thấy lịch hẹn" });

        const accessError = await ensureAppointmentAccess(req, appointment);
        if (accessError) {
            return res.status(accessError.status).json({ success: false, message: accessError.message });
        }

        if (!["confirmed", "in_progress"].includes(appointment.status)) {
            return res.status(400).json({
                success: false,
                message: "Chỉ có thể hoàn thành lịch hẹn đã xác nhận hoặc đang khám",
            });
        }

        const appointmentDateTime = getAppointmentDateTime(appointment);
        if (appointment.status === "confirmed" && appointmentDateTime && appointmentDateTime > new Date()) {
            return res.status(400).json({
                success: false,
                message: "Không thể hoàn thành lịch hẹn chưa tới giờ khám",
            });
        }

        appointment.status = "completed";
        if (req.body.diagnosis) appointment.diagnosis = req.body.diagnosis;
        await appointment.save();

        await emitAppointmentChanged(appointment, "completed");
        return apiResponse(res, 200, "Cập nhật hoàn thành thành công", appointment);
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// PATCH /appointments/:id/confirm — Confirm appointment (doctor/admin)
// Áp dụng cho cả pending và rescheduled (cần xác nhận lại sau đổi lịch)
// ──────────────────────────────────────────────────────────────────
export const confirmAppointment = async (req, res, next) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ success: false, message: "Không tìm thấy lịch hẹn" });

        const accessError = await ensureAppointmentAccess(req, appointment);
        if (accessError) {
            return res.status(accessError.status).json({ success: false, message: accessError.message });
        }

        const allowedStatuses = ["pending", "rescheduled"];
        if (!allowedStatuses.includes(appointment.status)) {
            return res.status(400).json({
                success: false,
                message: `Chỉ có thể xác nhận lịch hẹn ở trạng thái "Chờ xác nhận" hoặc "Đã đổi lịch"`,
            });
        }

        const appointmentDateTime = getAppointmentDateTime(appointment);
        if (appointmentDateTime && appointmentDateTime.getTime() + CONFIRM_GRACE_MS < Date.now()) {
            return res.status(400).json({
                success: false,
                message: "Không thể xác nhận lịch hẹn đã quá hạn",
            });
        }

        appointment.status = "confirmed";
        await appointment.save();

        // Notify patient (in-app)
        await createNotification(
            appointment.patientId,
            "appointment",
            "Lịch hẹn đã được xác nhận",
            `Lịch hẹn của bạn vào ${appointment.startTime || appointment.timeSlot} đã được xác nhận. Vui lòng đến đúng giờ.`
        );

        // Send confirmation email to patient
        try {
            const populated = await Appointment.findById(appointment._id)
                .populate("patientId", "email fullName")
                .populate({ path: "doctorId", populate: { path: "userId", select: "fullName" } })
                .populate("serviceId", "name");

            const patientUser = populated?.patientId;
            if (patientUser?.email) {
                const doctorName = populated?.doctorId?.userId?.fullName || "Bác sĩ";
                const serviceName = populated?.serviceId?.name || "Dịch vụ nha khoa";
                const apptDate = populated?.appointmentDate || populated?.date;
                const bookingUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/patient/appointments`;
                const { subject, html } = appointmentConfirmedTemplate({
                    patientName: patientUser.fullName || "Bệnh nhân",
                    serviceName,
                    doctorName,
                    dateStr: apptDate ? new Date(apptDate).toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "",
                    timeStr: appointment.startTime || appointment.timeSlot || "",
                    bookingUrl,
                });
                await sendEmail(patientUser.email, subject, html);
            }
        } catch (emailErr) {
            console.error("Email gửi không thành công (xác nhận lịch):", emailErr.message);
        }

        await emitAppointmentChanged(appointment, "confirmed");
        return apiResponse(res, 200, "Xác nhận lịch hẹn thành công", appointment);
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// PATCH /appointments/:id/checkin — Check-in bệnh nhân (doctor/admin)
// Bệnh nhân đến quầy lễ tân → staff/bác sĩ ấn check-in
// confirmed → in_progress
// ──────────────────────────────────────────────────────────────────
export const checkInAppointment = async (req, res, next) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ success: false, message: "Không tìm thấy lịch hẹn" });

        const accessError = await ensureAppointmentAccess(req, appointment);
        if (accessError) {
            return res.status(accessError.status).json({ success: false, message: accessError.message });
        }

        if (appointment.status !== "confirmed") {
            return res.status(400).json({
                success: false,
                message: "Chỉ có thể check-in lịch hẹn đã được xác nhận",
            });
        }

        const appointmentDateTime = getAppointmentDateTime(appointment);
        if (appointmentDateTime) {
            const nowMs = Date.now();
            const appointmentMs = appointmentDateTime.getTime();
            if (nowMs < appointmentMs - CHECK_IN_WINDOW_BEFORE_MS) {
                return res.status(400).json({
                    success: false,
                    message: "Chưa đến giờ check-in. Chỉ có thể check-in sớm tối đa 30 phút",
                });
            }
            if (nowMs > appointmentMs + CHECK_IN_WINDOW_AFTER_MS) {
                return res.status(400).json({
                    success: false,
                    message: "Lịch hẹn đã quá hạn check-in",
                });
            }
        }

        appointment.status = "in_progress";
        appointment.checkedInAt = new Date();
        await appointment.save();

        // Notify patient
        await createNotification(
            appointment.patientId,
            "appointment",
            "Đã check-in thành công",
            `Bạn đã được ghi nhận có mặt. Vui lòng chờ bác sĩ gọi tên.`
        );

        await emitAppointmentChanged(appointment, "checked-in");
        return apiResponse(res, 200, "Check-in thành công", appointment);
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// GET /appointments/all — Admin: get all appointments
// ──────────────────────────────────────────────────────────────────
export const getAllAppointments = async (req, res, next) => {
    try {
        const { status, doctorId, patientId } = req.query;
        const filter = {};
        if (status && status !== "all") filter.status = status;

        if (req.user.role === "doctor") {
            const doctorProfile = await Doctor.findOne({ userId: req.user.id }).select("_id").lean();
            if (!doctorProfile) {
                return apiResponse(res, 200, "Lấy danh sách lịch hẹn thành công", []);
            }
            filter.doctorId = doctorProfile._id;
        } else {
            if (doctorId) filter.doctorId = doctorId;
            if (patientId) filter.patientId = patientId;
        }

        const appointments = await Appointment.find(filter)
            .populate("patientId", "fullName phone email")
            .populate({ path: "doctorId", populate: { path: "userId", select: "fullName specialization" } })
            .populate("serviceId", "name price")
            .sort({ appointmentDate: -1, date: -1, createdAt: -1 });

        return apiResponse(res, 200, "Lấy danh sách lịch hẹn thành công", appointments);
    } catch (error) {
        next(error);
    }
};
