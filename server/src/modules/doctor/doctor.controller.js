import User from "../user/user.model.js";
import Doctor from "./doctor.model.js";
import Schedule from "../schedule/schedule.model.js";
import Appointment from "../appointment/appointment.model.js";
import Service from "../service/service.model.js";
import apiResponse from "../../utils/apiResponse.js";
import { emitPublic, emitToRole, emitToUser } from "../../realtime/socket.js";
import { filterSlotsByApprovedLeave } from "../leaveRequest/leaveRequest.utils.js";

const emitDoctorChanged = (action, doctor) => {
    const doctorId = doctor?._id?.toString();
    const userId = doctor?.userId?._id || doctor?.userId;
    const payload = { action, doctorId, userId: userId?.toString() };
    emitToRole("admin", "doctor:changed", payload);
    emitToRole("patient", "doctor:changed", payload);
    emitPublic("doctor:changed", payload);
    emitPublic("public:landing-changed", { source: "doctor", action });
    if (userId) emitToUser(userId, "profile:changed", { source: "doctor", action });
};

const getMonday = (date) => {
    const d = new Date(date.getTime()); // Clone to avoid mutating original date
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));

    const y = mon.getFullYear();
    const m = String(mon.getMonth() + 1).padStart(2, '0');
    const dd = String(mon.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
};

const getServicesPopulate = (isAdmin = false) => ({
    path: "services",
    select: "name description price duration image category isActive isDeleted",
    match: isAdmin
        ? { isDeleted: { $ne: true } }
        : { isActive: true, isDeleted: { $ne: true } },
});

const sanitizeServiceIds = async (services = []) => {
    if (!Array.isArray(services) || services.length === 0) return [];

    const ids = services
        .map((service) => service?._id || service)
        .filter(Boolean)
        .map((service) => service.toString());

    if (ids.length === 0) return [];

    const validServices = await Service.find({
        _id: { $in: ids },
        isDeleted: { $ne: true },
    }).select("_id").lean();

    const validSet = new Set(validServices.map((service) => service._id.toString()));
    return ids.filter((id, index) => validSet.has(id) && ids.indexOf(id) === index);
};

// ──────────────────────────────────────────────────────────────────
// Utility: generate time slots between start and end with `duration` step
// Marks slots as unavailable if they conflict with bookedAppointments
// ──────────────────────────────────────────────────────────────────
const calculateAvailableSlots = (startTime, endTime, duration, bookedAppointments) => {
    const slots = [];
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    let currentMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    while (currentMin + duration <= endMin) {
        const slotH = Math.floor(currentMin / 60);
        const slotM = currentMin % 60;
        const slotTime = `${String(slotH).padStart(2, "0")}:${String(slotM).padStart(2, "0")}`;
        const slotEndMin = currentMin + duration;

        const isBooked = bookedAppointments.some((appt) => {
            const apptStart = appt.startTime || appt.timeSlot;
            const apptEnd = appt.endTime;
            if (!apptStart) return false;

            const [aH, aM] = apptStart.split(":").map(Number);
            const aStart = aH * 60 + aM;
            let aEnd = aStart + 30;
            if (apptEnd) {
                const [eH, eM] = apptEnd.split(":").map(Number);
                aEnd = eH * 60 + eM;
            }
            return currentMin < aEnd && slotEndMin > aStart;
        });

        slots.push({ time: slotTime, available: !isBooked });
        currentMin += duration;
    }
    return slots;
};

// ──────────────────────────────────────────────────────────────────
// GET /doctors — list all doctors (public)
// Nếu serviceId được truyền, ưu tiên filter theo services array
// Nếu không có doctor nào khớp → fallback trả tất cả bác sĩ
// ──────────────────────────────────────────────────────────────────
export const getDoctors = async (req, res, next) => {
    try {
        const { serviceId } = req.query;
        const isAdmin = req.user?.role === "admin";

        // Populate userId để lấy fullName, email, phone, avatar
        const populate = { path: "userId", select: "fullName email phone avatar isActive" };
        const servicePopulate = getServicesPopulate(isAdmin);

        let doctors = [];

        if (serviceId) {
            const service = await Service.findOne({
                _id: serviceId,
                isDeleted: { $ne: true },
                ...(isAdmin ? {} : { isActive: true }),
            }).select("_id").lean();
            if (!service) return apiResponse(res, 200, "Doctors list retrieved", []);

            // ONLY filter by services array. NO fallback to all doctors.
            doctors = await Doctor.find({ services: serviceId }).populate(populate).populate(servicePopulate);
        } else {
            doctors = await Doctor.find({}).populate(populate).populate(servicePopulate);
        }

        if (!isAdmin) {
            doctors = doctors.filter((doctor) => doctor.userId?.isActive !== false);
        }

        return apiResponse(res, 200, "Doctors list retrieved", doctors);
    } catch (error) {
        next(error);
    }
};


// ──────────────────────────────────────────────────────────────────
// GET /doctors/me/schedule — Doctor's weekly appointments calendar
// ──────────────────────────────────────────────────────────────────
export const getDoctorWeekSchedule = async (req, res, next) => {
    try {
        const { weekStart } = req.query;
        if (!weekStart) {
            return res.status(400).json({ success: false, message: "Thiếu tham số weekStart" });
        }

        const doctor = await Doctor.findOne({ userId: req.user.id });
        if (!doctor) return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ bác sĩ" });

        const start = new Date(weekStart);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        end.setHours(23, 59, 59, 999);

        const appointments = await Appointment.find({
            doctorId: doctor._id,
            $or: [
                { appointmentDate: { $gte: start, $lte: end } },
                { date: { $gte: start, $lte: end } },
            ],
            status: { $nin: ["cancelled"] },
        })
            .populate("patientId", "fullName phone email avatar")
            .populate("serviceId", "name duration price")
            .sort({ appointmentDate: 1, date: 1, startTime: 1 });

        return apiResponse(res, 200, "Lấy lịch thành công", { appointments });
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// GET /doctors/aggregated-slots — Unified slot checking API
// ──────────────────────────────────────────────────────────────────
export const getAggregatedSlots = async (req, res, next) => {
    try {
        const { date, serviceId } = req.query;
        if (!date || !serviceId) {
            return res.status(400).json({ success: false, message: "Thiếu tham số date hoặc serviceId" });
        }

        const [y, m, d] = date.split("-").map(Number);
        const targetDate = new Date(y, m - 1, d);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (targetDate < today) {
            return apiResponse(res, 200, "Lấy khung giờ thành công", { slots: [] });
        }

        const dayOfWeek = targetDate.getDay();
        const weekStart = getMonday(targetDate);

        const service = await Service.findOne({ _id: serviceId, isActive: true, isDeleted: { $ne: true } });
        if (!service) return res.status(404).json({ success: false, message: "Không tìm thấy dịch vụ" });
        const duration = service.duration || 30;

        const populate = { path: "userId", select: "fullName email phone avatar isActive" };
        const doctors = await Doctor.find({ services: serviceId }).populate(populate);

        if (doctors.length === 0) {
            return apiResponse(res, 200, "Lấy khung giờ thành công", { slots: [] });
        }

        const dayStart = new Date(targetDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(targetDate);
        dayEnd.setHours(23, 59, 59, 999);

        const slotMap = {};

        for (const doctor of doctors) {
            if (!doctor.userId) continue;
            if (doctor.userId?.isActive === false) continue;

            // Ưu tiên: lịch tuần cụ thể trước, fallback to recurring (weekStart: null)
            let scheduleEntry = await Schedule.findOne({
                doctorId: doctor.userId._id || doctor.userId,
                dayOfWeek: dayOfWeek,
                weekStart: weekStart,
            });

            if (!scheduleEntry) {
                scheduleEntry = await Schedule.findOne({
                    doctorId: doctor.userId._id || doctor.userId,
                    dayOfWeek: dayOfWeek,
                    weekStart: null,
                });
            }

            if (!scheduleEntry || !scheduleEntry.startTime || !scheduleEntry.endTime) {
                continue;
            }

            const bookedAppointments = await Appointment.find({
                doctorId: doctor._id,
                $or: [
                    { appointmentDate: { $gte: dayStart, $lte: dayEnd } },
                    { date: { $gte: dayStart, $lte: dayEnd } },
                ],
                status: { $nin: ["cancelled"] },
            }).select("startTime endTime timeSlot");

            const slots = calculateAvailableSlots(
                scheduleEntry.startTime,
                scheduleEntry.endTime,
                duration,
                bookedAppointments
            );
            const availableSlots = await filterSlotsByApprovedLeave(slots, doctor.userId._id || doctor.userId, date);

            for (const slot of availableSlots) {
                if (!slotMap[slot.time]) {
                    slotMap[slot.time] = { time: slot.time, available: false, doctors: [] };
                }
                if (slot.available) {
                    slotMap[slot.time].available = true;
                    // Store the doctor ID string
                    const docId = doctor._id.toString();
                    if (!slotMap[slot.time].doctors.includes(docId)) {
                        slotMap[slot.time].doctors.push(docId);
                    }
                }
            }
        }

        const sortedSlots = Object.values(slotMap).sort((a, b) => a.time.localeCompare(b.time));

        // Chỉ trả về những bác sĩ thực sự có ít nhất 1 slot trống trong ngày đó
        const activeDoctorIds = new Set(
            sortedSlots.flatMap(slot => slot.available ? slot.doctors : [])
        );
        const availableDoctors = doctors.filter(d => activeDoctorIds.has(d._id.toString()));

        return apiResponse(res, 200, "Lấy khung giờ thành công", {
            slots: sortedSlots,
            doctors: availableDoctors,
        });
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// GET /doctors/:id/available-slots — Get available time slots for booking
// ──────────────────────────────────────────────────────────────────
export const getAvailableSlots = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { date, serviceId } = req.query;

        if (!date) {
            return res.status(400).json({ success: false, message: "Thiếu tham số date" });
        }

        // Max lookahead 60 days
        const [y, m, d] = date.split("-").map(Number);
        const targetDate = new Date(y, m - 1, d); // Parse as local midnight to avoid timezone shifts
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const maxDate = new Date(today);
        maxDate.setDate(maxDate.getDate() + 60);

        if (targetDate < today) {
            return res.status(400).json({ success: false, message: "Không thể chọn ngày trong quá khứ" });
        }
        if (targetDate > maxDate) {
            return res.status(400).json({ success: false, message: "Chỉ có thể đặt lịch trong vòng 60 ngày tới" });
        }

        const doctor = await Doctor.findById(id);
        if (!doctor) return res.status(404).json({ success: false, message: "Không tìm thấy bác sĩ" });

        // Ensure userId exists
        if (!doctor.userId) {
            return apiResponse(res, 200, "Bác sĩ chưa được thiết lập tài khoản", { slots: [] });
        }

        // Get service duration
        let duration = 30;
        if (serviceId) {
            const service = await Service.findById(serviceId);
            if (service) duration = service.duration || 30;
        }

        // Check doctor's schedule for this day of week
        const dayOfWeek = targetDate.getDay();
        const weekStart = getMonday(targetDate);

        // Ưu tiên: lịch tuần cụ thể trước, fallback to recurring (weekStart: null)
        let scheduleEntry = await Schedule.findOne({
            doctorId: doctor.userId,
            dayOfWeek: dayOfWeek,
            weekStart: weekStart,
        });

        if (!scheduleEntry) {
            scheduleEntry = await Schedule.findOne({
                doctorId: doctor.userId,
                dayOfWeek: dayOfWeek,
                weekStart: null,
            });
        }

        if (!scheduleEntry || !scheduleEntry.startTime || !scheduleEntry.endTime) {
            return apiResponse(res, 200, "Bác sĩ không có ca làm việc vào ngày này", { slots: [] });
        }

        // Get existing booked appointments for this date
        const dayStart = new Date(targetDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(targetDate);
        dayEnd.setHours(23, 59, 59, 999);

        const bookedAppointments = await Appointment.find({
            doctorId: id,
            $or: [
                { appointmentDate: { $gte: dayStart, $lte: dayEnd } },
                { date: { $gte: dayStart, $lte: dayEnd } },
            ],
            status: { $nin: ["cancelled"] },
        }).select("startTime endTime timeSlot");

        const slots = calculateAvailableSlots(
            scheduleEntry.startTime,
            scheduleEntry.endTime,
            duration,
            bookedAppointments
        );

        const availableSlots = await filterSlotsByApprovedLeave(slots, doctor.userId, date);

        return apiResponse(res, 200, "Lấy khung giờ thành công", { slots: availableSlots });
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// GET /doctors/:id — Single doctor (public)
// ──────────────────────────────────────────────────────────────────
export const getDoctorById = async (req, res, next) => {
    try {
        const doctor = await Doctor.findById(req.params.id)
            .populate("userId", "fullName email phone avatar isActive")
            .populate(getServicesPopulate(false));
        if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });
        if (doctor.userId?.isActive === false) {
            return res.status(404).json({ success: false, message: "Doctor not found" });
        }
        return apiResponse(res, 200, "Doctor details retrieved", doctor);
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// GET /doctors/profile/me — Doctor's own profile
// ──────────────────────────────────────────────────────────────────
export const getDoctorProfile = async (req, res, next) => {
    try {
        const doctor = await Doctor.findOne({ userId: req.user.id }).populate("userId", "fullName email phone avatar");
        if (!doctor) return res.status(404).json({ success: false, message: "Doctor profile not found" });
        return apiResponse(res, 200, "Doctor profile retrieved", doctor);
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// PUT /doctors/profile/me — Update doctor's own profile
// ──────────────────────────────────────────────────────────────────
export const updateDoctorProfile = async (req, res, next) => {
    try {
        const doctor = await Doctor.findOneAndUpdate(
            { userId: req.user.id },
            { $set: req.body },
            { new: true, runValidators: true }
        );
        emitDoctorChanged("profile-updated", doctor);
        return apiResponse(res, 200, "Doctor profile updated", doctor);
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// GET /doctors/today/appointments — Doctor's appointments today
// ──────────────────────────────────────────────────────────────────
export const getTodayAppointments = async (req, res, next) => {
    try {
        const doctor = await Doctor.findOne({ userId: req.user.id });
        const doctorId = doctor?._id || req.user.id;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const appointments = await Appointment.find({
            doctorId,
            $or: [
                { appointmentDate: { $gte: today, $lt: tomorrow } },
                { date: { $gte: today, $lt: tomorrow } },
            ],
        }).populate("patientId", "fullName phone");

        return apiResponse(res, 200, "Today's appointments retrieved", appointments);
    } catch (error) {
        next(error);
    }
};

// ── Admin-only CRUD ───────────────────────────────────────────
export const adminCreateDoctor = async (req, res, next) => {
    try {
        const { name, email, phone, password, specialization, experience, bio, services } = req.body;

        if (!name || !email || !password || !specialization) {
            return res.status(400).json({ success: false, message: "Vui lòng điền đầy đủ thông tin bắt buộc" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email đã được sử dụng" });
        }

        const user = await User.create({
            fullName: name,
            email,
            phone,
            password,
            role: "doctor",
            isActive: true,
        });

        const cleanServices = await sanitizeServiceIds(services);

        const doctor = await Doctor.create({
            userId: user._id,
            specialization,
            experience: experience || 0,
            bio: bio || "",
            licenseNumber: `BS-${Date.now()}`,
            // Assign services nếu được cung cấp
            services: cleanServices,
        });

        const populatedDoctor = await Doctor.findById(doctor._id)
            .populate("userId", "fullName email phone")
            .populate(getServicesPopulate(true));
        emitDoctorChanged("created", populatedDoctor);
        return apiResponse(res, 201, "Đã tạo bác sĩ thành công", populatedDoctor);
    } catch (error) {
        next(error);
    }
};

export const adminUpdateDoctor = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, phone, specialization, experience, bio, isActive, services } = req.body;

        const doctor = await Doctor.findById(id);
        if (!doctor) return res.status(404).json({ success: false, message: "Không tìm thấy bác sĩ" });

        if (name || phone || isActive !== undefined) {
            await User.findByIdAndUpdate(doctor.userId, {
                ...(name && { fullName: name }),
                ...(phone && { phone }),
                ...(isActive !== undefined && { isActive }),
            });
        }

        const updateFields = {};
        if (specialization) updateFields.specialization = specialization;
        if (experience !== undefined) updateFields.experience = experience;
        if (bio !== undefined) updateFields.bio = bio;
        // Cho phép cập nhật services array
        if (Array.isArray(services)) updateFields.services = await sanitizeServiceIds(services);

        const updatedDoctor = await Doctor.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true }
        )
            .populate("userId", "fullName email phone")
            .populate(getServicesPopulate(true));

        emitDoctorChanged("updated", updatedDoctor);
        return apiResponse(res, 200, "Đã cập nhật bác sĩ", updatedDoctor);
    } catch (error) {
        next(error);
    }
};

export const adminDeleteDoctor = async (req, res, next) => {
    try {
        const { id } = req.params;
        const doctor = await Doctor.findById(id);
        if (!doctor) return res.status(404).json({ success: false, message: "Không tìm thấy bác sĩ" });

        const userId = doctor.userId;
        await User.findByIdAndDelete(userId);
        await Doctor.findByIdAndDelete(id);

        emitDoctorChanged("deleted", { _id: id, userId });
        return apiResponse(res, 200, "Đã xóa bác sĩ thành công");
    } catch (error) {
        next(error);
    }
};
