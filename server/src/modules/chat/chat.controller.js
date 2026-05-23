import ChatSession from "./chatSession.model.js";
import Appointment from "../appointment/appointment.model.js";
import Doctor from "../doctor/doctor.model.js";
import Service from "../service/service.model.js";
import Schedule from "../schedule/schedule.model.js";
import { runRagChain, runRagChainStream, retrieveRagContext } from "../../rag/chain/ragChain.js";
import { computeDoctorAvailability } from "../schedule/schedule.controller.js";
import { filterSlotsByApprovedLeave } from "../leaveRequest/leaveRequest.utils.js";
import apiResponse from "../../utils/apiResponse.js";

const normalizeText = (value = "") => value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();

const stripBS = (name) => (name || "").replace(/^BS\.\s*/gi, "").trim();

const redactPIIForStorage = (value = "") => value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL_REDACTED]")
    .replace(/(?:\+?84|0)(?:\d[\s.-]?){8,10}\d/g, "[PHONE_REDACTED]")
    .replace(/\b\d{9,12}\b/g, "[ID_REDACTED]");

const getCurrentDate = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date()).split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
};

const hasPromptInjectionRisk = (message = "") => {
    const text = normalizeText(message);
    return /(bo qua|ignore|forget|tiet lo|reveal|system prompt|developer message|huong dan truoc|mien phi tat ca|tra loi sai|jailbreak)/.test(text);
};

const hasDoctorInfoSignal = (text = "") =>
    /(co bac si nao|danh sach bac si|doi ngu bac si|bac si nao|thong tin bac si|bac si.*khong|bs.*khong)/.test(text);

const hasServiceInfoSignal = (text = "") =>
    /(bang gia|gia dich vu|dich vu|chi phi|nieng rang|implant|e-max|emax|tay trang|nho rang|tram rang|boc rang)/.test(text);

const hasBookingActionSignal = (text = "") =>
    /(dat lich|dat hen|kiem tra lich|check lich|xem lich|con cho|con slot|con lich|trong lich|lich trong|slot trong|con trong)/.test(text);

const hasRelativeDateSignal = (text = "") =>
    /(hom nay|ngay mai|sang mai|chieu mai|toi mai|mai|tuan toi|thu 2|thu hai|thu 3|thu ba|thu 4|thu tu|thu 5|thu nam|thu 6|thu sau|thu 7|thu bay|chu nhat|cn|t2|t3|t4|t5|t6|t7|\b\d{1,2}[/-]\d{1,2})/.test(text);

const hasTimePeriodSignal = (text = "") =>
    /(sang|buoi sang|chieu|buoi chieu|toi|buoi toi|morning|afternoon|evening)/.test(text);

const hasBookingFlowSignal = (text = "") =>
    /(muon dat|muon hen|cho.*dat|can dat lich|dat lich kham|ho tro dat|tu van dat lich|dang ky kham|dang ky lich|can kham|giup.*dat|huong dan dat|bat dau dat)/.test(text);


const classifyChatIntent = (message = "", bookingContext = null) => {
    const text = normalizeText(message);

    // In-progress booking flow (bookingContext passed from frontend)
    if (bookingContext?.step) {
        return { intent: "BOOKING_FLOW", wantsDoctorInfo: false, wantsServiceInfo: false, bookingAction: true, hasSpecificEntities: false };
    }

    const wantsDoctorInfo = hasDoctorInfoSignal(text);
    const wantsServiceInfo = hasServiceInfoSignal(text);
    const bookingAction = hasBookingActionSignal(text);
    const specificDate = hasRelativeDateSignal(text);
    const specificPeriod = hasTimePeriodSignal(text);
    const doctorNameHint = /(bac si|bs)\s+[a-zA-Z\u00C0-\u1EF9]{2,}/i.test(message) && !/(bac si nao|danh sach bac si|doi ngu bac si)/.test(text);
    const hasSpecificEntities = specificDate || specificPeriod || doctorNameHint;

    // Explicit booking flow start (without a specific doctor name or date already provided)
    if (hasBookingFlowSignal(text) && !doctorNameHint) {
        return { intent: "BOOKING_FLOW", wantsDoctorInfo, wantsServiceInfo, bookingAction: true, hasSpecificEntities: false };
    }

    // Fallback: booking intent không có entity cụ thể → bắt đầu wizard thu thập thông tin
    // Bắt các câu như "Giúp mình đặt lịch", "Mình cần đặt khám", "Còn slot không?"

    if (bookingAction && !hasSpecificEntities && !doctorNameHint) {
        return { intent: "BOOKING_FLOW", wantsDoctorInfo, wantsServiceInfo, bookingAction: true, hasSpecificEntities: false };
    }

    if (bookingAction && hasSpecificEntities && (wantsDoctorInfo || wantsServiceInfo)) {
        return { intent: "MIXED", wantsDoctorInfo, wantsServiceInfo, bookingAction, hasSpecificEntities };
    }
    if (bookingAction && hasSpecificEntities) {
        return { intent: "BOOKING_CHECK", wantsDoctorInfo, wantsServiceInfo, bookingAction, hasSpecificEntities };
    }
    if (wantsDoctorInfo || wantsServiceInfo || bookingAction) {
        return { intent: "QUERY_INFO", wantsDoctorInfo, wantsServiceInfo, bookingAction, hasSpecificEntities };
    }
    return { intent: "QUERY_INFO", wantsDoctorInfo, wantsServiceInfo, bookingAction, hasSpecificEntities };
};

const getNextDateForWeekday = (weekday, nextWeek = false) => {
    const today = getCurrentDate();
    const current = today.getDay();
    if (nextWeek) {
        const daysSinceMonday = current === 0 ? 6 : current - 1;
        const thisMonday = new Date(today);
        thisMonday.setDate(today.getDate() - daysSinceMonday);
        const nextMonday = new Date(thisMonday);
        nextMonday.setDate(thisMonday.getDate() + 7);
        const offsetFromMonday = weekday === 0 ? 6 : weekday - 1;
        nextMonday.setDate(nextMonday.getDate() + offsetFromMonday);
        return nextMonday;
    }
    const date = new Date(today);
    let diff = (weekday - current + 7) % 7;
    if (diff === 0) diff += 7;
    date.setDate(today.getDate() + diff);
    return date;
};

const parseAvailabilityDate = (message = "") => {
    const text = normalizeText(message);
    const date = getCurrentDate();
    if (text.includes("hom nay")) return date;
    if (text.includes("ngay mai") || text.includes("sang mai") || text.includes("chieu mai") || text.includes("mai")) {
        date.setDate(date.getDate() + 1);
        return date;
    }

    const explicitDate = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?\b/);
    if (explicitDate) {
        const year = explicitDate[3] ? Number(explicitDate[3]) : date.getFullYear();
        return new Date(year, Number(explicitDate[2]) - 1, Number(explicitDate[1]));
    }

    const weekdayMap = [
        { pattern: /chu nhat|cn/, day: 0 },
        { pattern: /thu 2|thu hai|t2|monday/, day: 1 },
        { pattern: /thu 3|thu ba|t3|tuesday/, day: 2 },
        { pattern: /thu 4|thu tu|t4|wednesday/, day: 3 },
        { pattern: /thu 5|thu nam|t5|thursday/, day: 4 },
        { pattern: /thu 6|thu sau|t6|friday/, day: 5 },
        { pattern: /thu 7|thu bay|t7|saturday/, day: 6 },
    ];
    const match = weekdayMap.find((item) => item.pattern.test(text));
    if (!match) return null;
    return getNextDateForWeekday(match.day, text.includes("tuan toi"));
};

const parseTimePeriod = (message = "") => {
    const text = normalizeText(message);
    if (/sang|buoi sang|morning/.test(text)) return "morning";
    if (/chieu|buoi chieu|afternoon/.test(text)) return "afternoon";
    if (/toi|buoi toi|evening/.test(text)) return "evening";
    return "";
};

const filterSlotsByTimePeriod = (slots = [], timePeriod = "") => {
    if (!timePeriod) return slots;
    const toMinutes = (time = "") => {
        const [hour, minute] = time.split(":").map(Number);
        return hour * 60 + (minute || 0);
    };
    const ranges = {
        morning: [7 * 60, 12 * 60],
        afternoon: [12 * 60, 17 * 60 + 30],
        evening: [17 * 60 + 30, 21 * 60],
    };
    const range = ranges[timePeriod];
    return slots.filter((slot) => {
        const start = toMinutes(slot.startTime);
        return start >= range[0] && start < range[1];
    });
};

const formatDateValue = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

const extractDoctorMentionName = (message = "") => {
    const text = normalizeText(message);
    const match = text.match(/\b(?:bac si|bs)\s+([a-z\s]{2,50})/);
    if (!match) return "";
    const rawName = match[1]
        .split(/\b(?:co|con|lam|o|sang|chieu|toi|thu|ngay|mai|tuan|lich|dat|kham|khong|ko|hong|ha|a)\b/)[0]
        .trim();
    return rawName.split(/\s+/).filter(Boolean).slice(0, 3).join(" ");
};

const findDoctorsFromMessage = async (message = "") => {
    const text = normalizeText(message);
    const doctors = await Doctor.find().populate("userId", "fullName").lean();
    return doctors.filter((doctor) => {
        const name = normalizeText(doctor.userId?.fullName || "");
        if (!name) return false;
        return name.split(/\s+/).some((part) => part.length >= 3 && text.includes(part)) || text.includes(name);
    });
};

const getMondayStr = (date) => {
    const d = new Date(date.getTime());
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const calcSlots = (startTime, endTime, duration, bookedAppointments) => {
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
            if (!apptStart) return false;
            const [aH, aM] = apptStart.split(":").map(Number);
            const aStart = aH * 60 + aM;
            let aEnd = aStart + 30;
            if (appt.endTime) { const [eH, eM] = appt.endTime.split(":").map(Number); aEnd = eH * 60 + eM; }
            return currentMin < aEnd && slotEndMin > aStart;
        });
        slots.push({ time: slotTime, available: !isBooked });
        currentMin += duration;
    }
    return slots;
};

const filterBookingSlotsByTimePeriod = (slots, timePeriod) => {
    if (!timePeriod) return slots;
    const ranges = { morning: [7 * 60, 12 * 60], afternoon: [12 * 60, 17 * 60 + 30], evening: [17 * 60 + 30, 21 * 60] };
    const range = ranges[timePeriod];
    if (!range) return slots;
    const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    return slots.filter((s) => { const start = toMin(s.time); return start >= range[0] && start < range[1]; });
};

const formatDateVN = (dateStr) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
};

const DATE_PAGE_SIZE = 5;
const DATE_MAX_PAGE = 3;

const parseDateForBooking = (message = "") => {
    const text = normalizeText(message);
    const today = getCurrentDate();
    const explicit = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?\b/);
    if (explicit) {
        const year = explicit[3] ? Number(explicit[3]) : today.getFullYear();
        const d = new Date(year, Number(explicit[2]) - 1, Number(explicit[1]));
        const todayMidnight = new Date(today); todayMidnight.setHours(0, 0, 0, 0);
        if (!isNaN(d.getTime()) && d >= todayMidnight) return formatDateValue(d);
    }
    const weekdayMap = [
        { pattern: /chu nhat|cn/, day: 0 },
        { pattern: /thu 2|thu hai|t2|monday/, day: 1 },
        { pattern: /thu 3|thu ba|t3|tuesday/, day: 2 },
        { pattern: /thu 4|thu tu|t4|wednesday/, day: 3 },
        { pattern: /thu 5|thu nam|t5|thursday/, day: 4 },
        { pattern: /thu 6|thu sau|t6|friday/, day: 5 },
        { pattern: /thu 7|thu bay|t7|saturday/, day: 6 },
    ];
    const wdMatch = weekdayMap.find((item) => item.pattern.test(text));
    if (!wdMatch) return null;
    const isNextWeek = text.includes("tuan toi") || text.includes("tuan sau");
    return formatDateValue(getNextDateForWeekday(wdMatch.day, isNextWeek));
};

const parseTimeForBooking = (message = "") => {
    const text = normalizeText(message);
    // Thử HH:MM trước (vd: 14:00, 9:30)
    const mColon = text.match(/\b(\d{1,2}):(\d{2})\b/);
    if (mColon) {
        const h = Number(mColon[1]);
        const mn = Number(mColon[2]);
        if (h >= 0 && h <= 23) return `${String(h).padStart(2, "0")}:${String(mn).padStart(2, "0")}`;
    }
    // Thử "Xh[MM]" hoặc "X gio [MM]" với chiều/tối
    const mHour = text.match(/\b(\d{1,2})\s*(?:h|gio)\s*(\d{0,2})/);
    if (mHour) {
        let h = Number(mHour[1]);
        const mn = Number(mHour[2] || 0);
        if (/\b(chieu|toi)\b/.test(text) && h < 12) h += 12;
        if (h >= 0 && h <= 23) return `${String(h).padStart(2, "0")}:${String(mn).padStart(2, "0")}`;
    }
    return null;
};

const matchServiceFromText = (text, services) => {
    const norm = normalizeText(text);
    const matched = services.filter((s) =>
        normalizeText(s.name).split(/\s+/).some((p) => p.length >= 3 && norm.includes(p))
    );
    return matched.length === 1 ? matched[0] : null;
};

const matchDoctorFromText = (text, doctors) => {
    const norm = normalizeText(text);
    const matched = doctors.filter((d) => {
        const name = normalizeText(d.userId?.fullName || "");
        return name && (norm.includes(name) || name.split(/\s+/).some((p) => p.length >= 3 && norm.includes(p)));
    });
    return matched.length === 1 ? matched[0] : null;
};

const getSlotsForDoctor = async (doctorId, dateStr, serviceId) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const targetDate = new Date(y, m - 1, d);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (targetDate < today) return [];

    const dayOfWeek = targetDate.getDay();
    const weekStart = getMondayStr(targetDate);

    const service = await Service.findOne({ _id: serviceId, isActive: true, isDeleted: { $ne: true } }).lean();
    if (!service) return [];
    const duration = service.duration || 30;

    const doctor = await Doctor.findById(doctorId).populate("userId", "fullName isActive").lean();
    if (!doctor || !doctor.userId || doctor.userId.isActive === false) return [];
    const doctorUserId = doctor.userId._id;

    let scheduleEntry = await Schedule.findOne({ doctorId: doctorUserId, dayOfWeek, weekStart }).lean();
    if (!scheduleEntry) scheduleEntry = await Schedule.findOne({ doctorId: doctorUserId, dayOfWeek, weekStart: null }).lean();
    if (!scheduleEntry || scheduleEntry.isOff || !scheduleEntry.startTime || !scheduleEntry.endTime) return [];

    const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999);
    const booked = await Appointment.find({
        doctorId,
        $or: [{ appointmentDate: { $gte: dayStart, $lte: dayEnd } }, { date: { $gte: dayStart, $lte: dayEnd } }],
        status: { $nin: ["cancelled"] },
    }).select("startTime endTime timeSlot").lean();

    const allSlots = calcSlots(scheduleEntry.startTime, scheduleEntry.endTime, duration, booked);
    const afterLeave = await filterSlotsByApprovedLeave(allSlots, doctorUserId, dateStr);
    return afterLeave.filter((s) => s.available).map((s) => s.time);
};

const matchSlotFromText = (text, slots) => {
    const norm = normalizeText(text);
    const timeHint = parseTimeForBooking(text);
    const nameParts = norm.split(/\s+/).filter((p) => p.length >= 3);
    let filtered = slots;
    if (timeHint) {
        filtered = filtered.filter((s) => s.time === timeHint);
    }
    if (nameParts.length) {
        const nameFiltered = filtered.filter((s) =>
            nameParts.some((p) => normalizeText(s.doctorName).includes(p))
        );
        if (nameFiltered.length) filtered = nameFiltered;
    }
    return filtered.length === 1 ? filtered[0] : null;
};

const generateDateQuickReplies = (page = 0) => {
    const today = getCurrentDate();
    const formatShort = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    const dayNames = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
    const start = page * DATE_PAGE_SIZE;
    const options = [];
    for (let i = 0; i < DATE_PAGE_SIZE; i++) {
        const d = new Date(today.getTime());
        d.setDate(d.getDate() + start + i);
        let label;
        if (page === 0 && i === 0) label = "Hôm nay";
        else if (page === 0 && i === 1) label = "Ngày mai";
        else label = dayNames[d.getDay()];
        options.push({
            label: `${label} (${formatShort(d)})`,
            value: `${label} (${formatShort(d)})`,
            bookingData: { date: formatDateValue(d), step: "time_select" },
        });
    }
    if (page < DATE_MAX_PAGE) {
        options.push({ label: "Xem thêm ngày →", value: "Xem thêm ngày", bookingData: { datePage: page + 1, step: "date_select" } });
    }
    if (page > 0) {
        options.push({ label: "← Trở về", value: "Trở về", bookingData: { datePage: page - 1, step: "date_select" } });
    }
    return options;
};

const getAvailableSlotsForBooking = async (dateStr, serviceId) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const targetDate = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (targetDate < today) return [];

    const dayOfWeek = targetDate.getDay();
    const weekStart = getMondayStr(targetDate);

    const service = await Service.findOne({ _id: serviceId, isActive: true, isDeleted: { $ne: true } }).lean();
    if (!service) return [];
    const duration = service.duration || 30;

    const doctors = await Doctor.find({ services: serviceId }).populate("userId", "fullName isActive").lean();
    const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999);
    const result = [];

    for (const doctor of doctors) {
        if (!doctor.userId || doctor.userId.isActive === false) continue;
        const doctorUserId = doctor.userId._id;

        let scheduleEntry = await Schedule.findOne({ doctorId: doctorUserId, dayOfWeek, weekStart }).lean();
        if (!scheduleEntry) scheduleEntry = await Schedule.findOne({ doctorId: doctorUserId, dayOfWeek, weekStart: null }).lean();
        if (!scheduleEntry || scheduleEntry.isOff || !scheduleEntry.startTime || !scheduleEntry.endTime) continue;

        const booked = await Appointment.find({
            doctorId: doctor._id,
            $or: [{ appointmentDate: { $gte: dayStart, $lte: dayEnd } }, { date: { $gte: dayStart, $lte: dayEnd } }],
            status: { $nin: ["cancelled"] },
        }).select("startTime endTime timeSlot").lean();

        const allSlots = calcSlots(scheduleEntry.startTime, scheduleEntry.endTime, duration, booked);
        const afterLeave = await filterSlotsByApprovedLeave(allSlots, doctorUserId, dateStr);
        const doctorName = doctor.userId.fullName || "Bác sĩ";
        const doctorId = doctor._id.toString();
        for (const slot of afterLeave) {
            if (slot.available) result.push({ doctorId, doctorName, time: slot.time });
        }
    }
    return result.sort((a, b) => a.time.localeCompare(b.time));
};

const hasBookingCancelSignal = (text = "") =>
    /^(huy|thoi|bo qua|khong muon dat|thoat|exit|cancel|quay lai)/.test(text) || text === "huy dat lich";

const conductBookingFlow = async (message, bookingContext, isAuthenticated) => {
    let ctx = bookingContext || {};
    const text = normalizeText(message || "");

    // Allow user to cancel the booking flow mid-way
    if (ctx.step && ctx.step !== "confirm" && hasBookingCancelSignal(text)) {
        return {
            answer: "Đã hủy đặt lịch. Bạn cần hỗ trợ thêm điều gì không?",
            sources: [],
            uiState: "done",
            quickReplies: [
                { label: "Đặt lịch khám", value: "Tôi muốn đặt lịch" },
                { label: "Xem dịch vụ", value: "Cho tôi xem bảng giá dịch vụ" },
            ],
            bookingAssist: null,
        };
    }

    // Step 1: No service selected yet
    if (!ctx.serviceId) {
        const services = await Service.find({ isActive: true, isDeleted: { $ne: true } })
            .select("_id name").sort({ name: 1 }).limit(12).lean();
        const matchedSvc = matchServiceFromText(text, services);
        if (matchedSvc) {
            ctx = { ...ctx, serviceId: matchedSvc._id.toString(), serviceName: matchedSvc.name };
        } else {
            return {
                answer: "Bạn muốn đặt lịch cho dịch vụ nào? Vui lòng chọn một dịch vụ bên dưới:",
                sources: [],
                uiState: "done",
                quickReplies: services.map((s) => ({
                    label: s.name, value: s.name,
                    bookingData: { serviceId: s._id.toString(), serviceName: s.name, step: "doctor_select" },
                })),
                bookingAssist: { step: "service_select" },
            };
        }
    }

    // Step 2: No doctor selected yet — show doctors for this service
    if (!ctx.doctorId) {
        const doctors = await Doctor.find({ services: ctx.serviceId })
            .populate("userId", "fullName isActive")
            .select("_id userId specialization")
            .lean();
        const activeDoctors = doctors.filter((d) => d.userId?.isActive !== false && d.userId);

        if (activeDoctors.length === 0) {
            return {
                answer: `Hiện chưa có bác sĩ phụ trách dịch vụ **${ctx.serviceName}**. Vui lòng chọn dịch vụ khác hoặc liên hệ phòng khám.`,
                sources: [],
                uiState: "done",
                quickReplies: [
                    { label: "Chọn dịch vụ khác", value: "Tôi muốn đặt lịch", bookingData: { reset: true } },
                ],
                bookingAssist: { step: "doctor_select", ...ctx },
            };
        }

        const matchedDoctor = matchDoctorFromText(text, activeDoctors);
        if (matchedDoctor) {
            ctx = { ...ctx, doctorId: matchedDoctor._id.toString(), doctorName: matchedDoctor.userId.fullName };
        } else {
            return {
                answer: `Dịch vụ **${ctx.serviceName}** — chọn bác sĩ bạn muốn khám:`,
                sources: [],
                uiState: "done",
                quickReplies: activeDoctors.slice(0, 10).map((d) => ({
                    label: `BS. ${stripBS(d.userId.fullName)}`,
                    value: `BS. ${stripBS(d.userId.fullName)}`,
                    bookingData: { doctorId: d._id.toString(), doctorName: stripBS(d.userId.fullName), step: "date_select" },
                })),
                bookingAssist: { step: "doctor_select", ...ctx },
            };
        }
    }

    // Step 3: No date selected yet
    if (!ctx.date) {
        const parsedDate = parseDateForBooking(text);
        if (parsedDate) {
            ctx = { ...ctx, date: parsedDate };
        } else {
            const page = ctx.datePage || 0;
            return {
                answer: `BS. **${stripBS(ctx.doctorName)}** — bạn muốn đặt khám vào ngày nào?\n_Hoặc gõ ngày cụ thể (vd: 28/05, thứ 2 tuần sau)_`,
                sources: [],
                uiState: "done",
                quickReplies: generateDateQuickReplies(page),
                bookingAssist: { step: "date_select", ...ctx },
            };
        }
    }

    // Step 4: No time selected — show available slots for this doctor
    if (!ctx.startTime) {
        const times = await getSlotsForDoctor(ctx.doctorId, ctx.date, ctx.serviceId);

        if (times.length === 0) {
            return {
                answer: `Rất tiếc, **BS. ${stripBS(ctx.doctorName)}** không có lịch trống vào **${formatDateVN(ctx.date)}**. Bạn muốn thử ngày khác hoặc đổi bác sĩ?`,
                sources: [],
                uiState: "done",
                quickReplies: [
                    { label: "Chọn ngày khác", value: "Chọn ngày khác", bookingData: { date: null, step: "date_select" } },
                    { label: "Đổi bác sĩ", value: "Đổi bác sĩ", bookingData: { doctorId: null, doctorName: null, date: null, step: "doctor_select" } },
                    { label: "Bắt đầu lại", value: "Tôi muốn đặt lịch", bookingData: { reset: true } },
                ],
                bookingAssist: { step: "time_select", ...ctx },
            };
        }

        const timeHint = parseTimeForBooking(text);
        if (timeHint && times.includes(timeHint)) {
            ctx = { ...ctx, startTime: timeHint };
        } else {
            return {
                answer: `Chọn giờ khám với **BS. ${stripBS(ctx.doctorName)}** vào **${formatDateVN(ctx.date)}**:\n_Hoặc gõ giờ cụ thể (vd: 8h, 14:30)_`,
                sources: [],
                uiState: "done",
                quickReplies: times.slice(0, 12).map((t) => ({
                    label: t,
                    value: t,
                    bookingData: { startTime: t, step: "confirm" },
                })),
                bookingAssist: { step: "time_select", ...ctx },
            };
        }
    }

    // Step 5: All info collected — show booking summary
    const loginUrl = `/auth/login?returnUrl=${encodeURIComponent("/patient/appointments")}`;

    return {
        answer: [
            `**Tóm tắt lịch hẹn:**`,
            `- Dịch vụ: **${ctx.serviceName}**`,
            `- Bác sĩ: **BS. ${stripBS(ctx.doctorName)}**`,
            `- Ngày: **${formatDateVN(ctx.date)}**`,
            `- Giờ: **${ctx.startTime}**`,
            ``,
            isAuthenticated
                ? `Nhấn **"Xác nhận đặt lịch"** để hoàn tất.`
                : `Vui lòng đăng nhập để tiến hành đặt lịch.`,
        ].join("\n"),
        sources: [],
        uiState: "done",
        quickReplies: [
            isAuthenticated
                ? { label: "Xác nhận đặt lịch", value: "Xác nhận", action: "create_booking" }
                : { label: "Đăng nhập để đặt lịch", value: "Đăng nhập", url: loginUrl },
            { label: "Bắt đầu lại", value: "Tôi muốn đặt lịch", bookingData: { reset: true } },
        ],
        bookingAssist: { step: "confirm", ...ctx },
    };
};

const buildBookingQuickReplies = (bookingUrl) => [
    { label: "Đặt lịch ngay", value: "Đặt lịch ngay", action: "booking", url: bookingUrl },
    { label: "Xem bảng giá", value: "Cho tôi xem bảng giá dịch vụ" },
    { label: "Tư vấn thêm", value: "Tư vấn thêm về dịch vụ này" },
];

const buildAvailabilityAnswer = async (message) => {
    const doctorMatches = await findDoctorsFromMessage(message);
    const date = parseAvailabilityDate(message);
    const timePeriod = parseTimePeriod(message);

    if (doctorMatches.length > 1) {
        const choices = doctorMatches.slice(0, 5).map((doctor) => ({
            doctorId: doctor._id,
            name: doctor.userId?.fullName || "Bác sĩ",
            specialization: doctor.specialization || "",
        }));
        return {
            answer: `Mình tìm thấy nhiều bác sĩ phù hợp. Bạn muốn kiểm tra lịch của bác sĩ nào?\n${choices.map((item, index) => `${index + 1}. ${item.name}${item.specialization ? ` - ${item.specialization}` : ""}`).join("\n")}`,
            sources: [],
            uiState: "checking_availability",
            quickReplies: choices.map((item) => ({ label: item.name, value: `Kiểm tra lịch ${item.name}` })),
            bookingAssist: { needsDoctorSelection: true, choices, timePeriod },
        };
    }

    const doctor = doctorMatches[0];
    if (!doctor || !date) {
        const mentionedDoctorName = extractDoctorMentionName(message);
        if (mentionedDoctorName && !doctor) {
            return {
                answer: `Mình không tìm thấy bác sĩ "${mentionedDoctorName}" trong hệ thống thực tế của DentaCare. Bạn có muốn xem danh sách bác sĩ hiện có để chọn lịch phù hợp không?`,
                sources: [],
                uiState: "checking_availability",
                quickReplies: [
                    { label: "Xem danh sách bác sĩ", value: "Phòng khám có bác sĩ nào?" },
                    { label: "Đặt lịch khám", value: "Tôi muốn đặt lịch khám" },
                ],
                bookingAssist: { doctorNotFound: true, doctorName: mentionedDoctorName },
            };
        }
        return {
            answer: "Mình có thể kiểm tra lịch trống cho bạn. Vui lòng cho biết rõ bác sĩ và ngày muốn khám, ví dụ: \"Thứ 2 tuần tới bác sĩ Cường còn trống lịch không?\"",
            sources: [],
            uiState: "checking_availability",
            quickReplies: [
                { label: "Xem danh sách bác sĩ", value: "Cho tôi xem danh sách bác sĩ" },
                { label: "Đặt lịch khám", value: "Tôi muốn đặt lịch khám" },
            ],
            bookingAssist: { needsMoreInfo: true, timePeriod },
        };
    }

    const dateValue = formatDateValue(date);
    const availability = await computeDoctorAvailability({ doctorId: doctor._id, date: dateValue });
    const slots = filterSlotsByTimePeriod(availability.availableSlots || [], timePeriod);
    const doctorName = availability.doctorName || doctor.userId?.fullName || "bác sĩ";
    const dateLabel = date.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
    const bookingUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/patient/book?doctorId=${doctor._id}&date=${dateValue}`;
    const periodLabel = timePeriod === "morning" ? "buổi sáng " : timePeriod === "afternoon" ? "buổi chiều " : timePeriod === "evening" ? "buổi tối " : "";
    const quickReplies = buildBookingQuickReplies(bookingUrl);

    if (slots.length === 0) {
        return {
            answer: `${doctorName} chưa còn khung giờ trống ${periodLabel}vào ${dateLabel}. Bạn có thể chọn ngày khác hoặc vào trang đặt lịch để xem thêm bác sĩ phù hợp: ${bookingUrl}`,
            sources: [],
            uiState: "checking_availability",
            quickReplies,
            bookingAssist: { doctorId: doctor._id, date: dateValue, timePeriod, availableSlots: [], bookingUrl },
        };
    }

    let sources = [];
    try {
        const ragContext = await retrieveRagContext(`${doctorName} ${doctor.specialization || ""}`);
        sources = ragContext.sources || [];
    } catch (_) {}

    const previewSlots = slots.slice(0, 5).map((slot) => `${slot.startTime}-${slot.endTime}`).join(", ");
    return {
        answer: `${doctorName} còn lịch trống ${periodLabel}vào ${dateLabel}: ${previewSlots}${slots.length > 5 ? "..." : ""}. Bạn có thể đặt lịch tại: ${bookingUrl}`,
        sources,
        uiState: "checking_availability",
        quickReplies,
        bookingAssist: { doctorId: doctor._id, date: dateValue, timePeriod, availableSlots: slots, bookingUrl },
    };
};

const buildDoctorContext = async (message = "") => {
    const text = normalizeText(message);
    const mentionedDoctorName = extractDoctorMentionName(message);
    const doctors = await Doctor.find()
        .populate("userId", "fullName email")
        .populate("services", "name")
        .lean();
    if (doctors.length === 0) return "";

    const matchedDoctors = doctors.filter((doctor) => {
        const name = normalizeText(doctor.userId?.fullName || "");
        return name && (text.includes(name) || name.split(/\s+/).some((part) => part.length >= 3 && text.includes(part)));
    });
    if (mentionedDoctorName && matchedDoctors.length === 0) {
        const availableDoctors = doctors
            .slice(0, 8)
            .map((doctor) => doctor.userId?.fullName)
            .filter(Boolean)
            .join(", ");
        return [
            `System note: Bác sĩ "${mentionedDoctorName}" không tồn tại trong hệ thống thực tế của DentaCare.`,
            "Hãy trả lời rõ ràng rằng không tìm thấy bác sĩ này trong hệ thống và gợi ý người dùng xem danh sách bác sĩ hiện có.",
            availableDoctors ? `Danh sách bác sĩ hiện có: ${availableDoctors}.` : "",
        ].filter(Boolean).join("\n");
    }
    const list = matchedDoctors.length > 0 ? matchedDoctors : doctors.slice(0, 8);

    return [
        "Dữ liệu hệ thống về bác sĩ DentaCare:",
        ...list.map((doctor) => {
            const services = Array.isArray(doctor.services) && doctor.services.length > 0
                ? ` Dịch vụ phụ trách: ${doctor.services.map((service) => service.name).filter(Boolean).join(", ")}.`
                : "";
            const experience = Number.isFinite(doctor.experience) ? ` Kinh nghiệm: ${doctor.experience} năm.` : "";
            const rating = Number.isFinite(doctor.rating) ? ` Đánh giá: ${doctor.rating}/5.` : "";
            return `- ${doctor.userId?.fullName || "Bác sĩ"}: ${doctor.specialization || "Chuyên khoa nha khoa"}.${experience}${rating}${services}`;
        }),
    ].join("\n");
};

const buildServiceContext = async () => {
    const services = await Service.find({ isActive: true, isDeleted: { $ne: true } })
        .select("name description price duration category")
        .sort({ category: 1, name: 1 })
        .limit(30)
        .lean();
    if (services.length === 0) return "";

    return [
        "Dữ liệu hệ thống về dịch vụ và bảng giá DentaCare:",
        ...services.map((service) => {
            const price = Number.isFinite(service.price) ? `${service.price.toLocaleString("vi-VN")} VND` : "Liên hệ";
            const duration = service.duration ? ` Thời lượng: ${service.duration} phút.` : "";
            const description = service.description ? ` ${service.description}` : "";
            return `- ${service.name}: ${price}.${duration}${description}`;
        }),
    ].join("\n");
};

const buildRuntimeSystemContext = async (message = "", intent = classifyChatIntent(message)) => {
    const sections = [];
    if (intent.wantsDoctorInfo || /bac si|bs|nha si/.test(normalizeText(message))) {
        const doctorContext = await buildDoctorContext(message);
        if (doctorContext) sections.push(doctorContext);
    }
    if (intent.wantsServiceInfo) {
        const serviceContext = await buildServiceContext();
        if (serviceContext) sections.push(serviceContext);
    }
    return sections.join("\n\n");
};

const withInfoQuickReplies = (result, intent, message = "") => {
    const normalized = normalizeChatResult(result);
    const replies = [...normalized.quickReplies];
    const addReply = (reply) => {
        if (!replies.some((item) => item.label === reply.label)) replies.push(reply);
    };

    if (intent.wantsDoctorInfo || /bac si|bs|nha si/.test(normalizeText(message))) {
        addReply({ label: "Xem danh sách bác sĩ", value: "Cho tôi xem danh sách bác sĩ" });
        addReply({ label: "Tư vấn chọn bác sĩ", value: "Tư vấn giúp tôi nên chọn bác sĩ như thế nào" });
    }
    if (intent.wantsServiceInfo) {
        addReply({ label: "Xem bảng giá", value: "Cho tôi xem bảng giá dịch vụ" });
        addReply({ label: "Tư vấn thêm", value: "Tư vấn thêm về dịch vụ này" });
    }

    return {
        ...normalized,
        quickReplies: replies.slice(0, 4),
        bookingAssist: undefined,
    };
};

const normalizeChatResult = (result) => ({
    answer: typeof result === "string" ? result : result.answer,
    sources: Array.isArray(result?.sources) ? result.sources : [],
    bookingAssist: result?.bookingAssist,
    quickReplies: Array.isArray(result?.quickReplies) ? result.quickReplies : [],
    uiState: result?.uiState || "done",
    streamed: Boolean(result?.streamed),
});

const MAX_SESSION_MESSAGES = 100;

const appendSessionMessages = async (session, userMessage, assistantMessage) => {
    session.messages.push({ role: "user", content: redactPIIForStorage(userMessage) });
    session.messages.push({ role: "assistant", content: redactPIIForStorage(assistantMessage) });
    if (session.messages.length > MAX_SESSION_MESSAGES) {
        session.messages = session.messages.slice(-MAX_SESSION_MESSAGES);
    }
    await session.save();
};

const getOrCreateSession = async (userId) => {
    let session = await ChatSession.findOne({ userId, isActive: true });
    if (!session) session = await ChatSession.create({ userId });
    return session;
};

const buildUserContext = async (userId) => {
    const appointments = await Appointment.find({
        patientId: userId,
        status: { $in: ["pending", "confirmed", "rescheduled"] },
    })
        .populate("serviceId", "name")
        .populate({ path: "doctorId", populate: { path: "userId", select: "fullName" } });

    if (appointments.length === 0) return "";

    let userContext = "Danh sách lịch hẹn sắp tới của người dùng (nếu họ hỏi về lịch của mình):\n";
    appointments.forEach((appt) => {
        const docName = appt.doctorId?.userId?.fullName || "Bác sĩ";
        const svcName = appt.serviceId?.name || "Dịch vụ";
        const dateStr = new Date(appt.appointmentDate || appt.date).toLocaleDateString("vi-VN");
        const timeStr = appt.startTime || appt.timeSlot || "";
        const statusMap = {
            pending: "Chờ xác nhận",
            confirmed: "Đã xác nhận",
            rescheduled: "Đã đổi lịch",
        };
        userContext += `- Ngày ${dateStr} lúc ${timeStr}: Khám ${svcName} với BS ${docName}. Trạng thái: ${statusMap[appt.status] || appt.status}.\n`;
    });
    return userContext;
};

const resolveChatResult = async (message, history = [], userContext = "", onEvent) => {
    if (hasPromptInjectionRisk(message)) {
        return {
            answer: "Mình chỉ có thể hỗ trợ theo thông tin chính thức của DentaCare và không thể bỏ qua các quy tắc an toàn nội bộ. Bạn muốn hỏi về dịch vụ, bảng giá hay đặt lịch khám?",
            sources: [],
            uiState: "done",
            quickReplies: [
                { label: "Xem bảng giá", value: "Cho tôi xem bảng giá dịch vụ" },
                { label: "Tư vấn dịch vụ", value: "Tư vấn giúp tôi nên chọn dịch vụ nha khoa nào" },
            ],
        };
    }

    const intent = classifyChatIntent(message);
    const runtimeContext = await buildRuntimeSystemContext(message, intent);
    const combinedContext = [userContext, runtimeContext].filter(Boolean).join("\n\n");

    if (intent.intent === "BOOKING_CHECK") {
        return buildAvailabilityAnswer(message);
    }

    if (intent.bookingAction && !intent.hasSpecificEntities) {
        return {
            answer: "Mình có thể kiểm tra lịch trống cho bạn! Bạn muốn khám với bác sĩ nào và vào ngày nào? Ví dụ: \"Thứ 3 tuần tới bác sĩ Cường còn lịch không?\"",
            sources: [],
            uiState: "checking_availability",
            quickReplies: [
                { label: "Xem danh sách bác sĩ", value: "Phòng khám có bác sĩ nào?" },
                { label: "Lịch hôm nay", value: "Hôm nay còn lịch trống không?" },
                { label: "Xem dịch vụ", value: "Cho tôi xem bảng giá dịch vụ" },
            ],
        };
    }

    if (intent.intent === "MIXED") {
        const ragResult = onEvent
            ? await runRagChainStream(message, history, combinedContext, onEvent)
            : await runRagChain(message, history, combinedContext);
        return withInfoQuickReplies(ragResult, intent, message);
    }

    const ragResult = onEvent
        ? await runRagChainStream(message, history, combinedContext, onEvent)
        : await runRagChain(message, history, combinedContext);
    return withInfoQuickReplies(ragResult, intent, message);
};

const validateMessage = (message) => typeof message === "string" && message.trim().length > 0;

const normalizePublicHistory = (history = []) => {
    if (!Array.isArray(history)) return [];
    return history
        .filter((item) => ["user", "assistant"].includes(item?.role) && typeof item?.content === "string")
        .map((item) => ({
            role: item.role,
            content: redactPIIForStorage(item.content).slice(0, 1200),
        }))
        .filter((item) => item.content.trim().length > 0)
        .slice(-6);
};

const publicRateMap = new Map();
const checkPublicRateLimit = (req, res) => {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const now = Date.now();
    const windowMs = 60_000;
    const maxReq = 20;
    const entry = publicRateMap.get(ip) || { count: 0, reset: now + windowMs };
    if (now > entry.reset) {
        entry.count = 0;
        entry.reset = now + windowMs;
    }
    entry.count++;
    publicRateMap.set(ip, entry);
    if (entry.count <= maxReq) return true;
    res.status(429).json({ success: false, message: "Quá nhiều yêu cầu, vui lòng thử lại sau." });
    return false;
};

export const sendMessage = async (req, res, next) => {
    try {
        const { message, bookingContext } = req.body;
        if (!validateMessage(message)) {
            return res.status(400).json({ success: false, message: "Tin nhắn không được để trống" });
        }

        const session = await getOrCreateSession(req.user.id);

        if (classifyChatIntent(message, bookingContext).intent === "BOOKING_FLOW") {
            const result = normalizeChatResult(await conductBookingFlow(message, bookingContext, true));
            await appendSessionMessages(session, message, result.answer);
            return apiResponse(res, 200, "AI response generated", { ...result, sessionId: session._id });
        }

        const userContext = await buildUserContext(req.user.id);
        const result = normalizeChatResult(await resolveChatResult(message, session.messages, userContext));

        await appendSessionMessages(session, message, result.answer);

        return apiResponse(res, 200, "AI response generated", {
            ...result,
            sessionId: session._id,
        });
    } catch (error) {
        next(error);
    }
};

export const sendPublicMessage = async (req, res, next) => {
    try {
        const { message, history, bookingContext } = req.body;
        if (!validateMessage(message)) {
            return res.status(400).json({ success: false, message: "Tin nhắn không được để trống" });
        }
        if (!checkPublicRateLimit(req, res)) return;

        if (classifyChatIntent(message, bookingContext).intent === "BOOKING_FLOW") {
            const result = normalizeChatResult(await conductBookingFlow(message, bookingContext, false));
            return apiResponse(res, 200, "AI response generated", result);
        }

        const result = normalizeChatResult(await resolveChatResult(message, normalizePublicHistory(history)));
        return apiResponse(res, 200, "AI response generated", result);
    } catch (error) {
        next(error);
    }
};

const sendSse = (res, event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
};

const prepareSseResponse = (res) => {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
};

export const streamMessage = async (req, res, next) => {
    try {
        const { message, bookingContext } = req.body;
        if (!validateMessage(message)) {
            return res.status(400).json({ success: false, message: "Tin nhắn không được để trống" });
        }

        const session = await getOrCreateSession(req.user.id);
        prepareSseResponse(res);

        if (classifyChatIntent(message, bookingContext).intent === "BOOKING_FLOW") {
            const result = normalizeChatResult(await conductBookingFlow(message, bookingContext, true));
            await appendSessionMessages(session, message, result.answer);
            sendSse(res, { type: "token", token: result.answer });
            sendSse(res, { type: "done", ...result, sessionId: session._id });
            return res.end();
        }

        const userContext = await buildUserContext(req.user.id);

        const onEvent = async (event) => sendSse(res, event);
        const rawResult = await resolveChatResult(message, session.messages, userContext, onEvent);
        const result = normalizeChatResult(rawResult);

        if (!rawResult?.streamed) {
            sendSse(res, { type: "token", token: result.answer });
        }

        await appendSessionMessages(session, message, result.answer);
        sendSse(res, { type: "done", ...result, sessionId: session._id });
        res.end();
    } catch (error) {
        if (res.headersSent) {
            sendSse(res, { type: "error", message: "Không thể tạo phản hồi AI" });
            return res.end();
        }
        next(error);
    }
};

export const streamPublicMessage = async (req, res, next) => {
    try {
        const { message, history, bookingContext } = req.body;
        if (!validateMessage(message)) {
            return res.status(400).json({ success: false, message: "Tin nhắn không được để trống" });
        }
        if (!checkPublicRateLimit(req, res)) return;

        prepareSseResponse(res);

        if (classifyChatIntent(message, bookingContext).intent === "BOOKING_FLOW") {
            const result = normalizeChatResult(await conductBookingFlow(message, bookingContext, false));
            sendSse(res, { type: "token", token: result.answer });
            sendSse(res, { type: "done", ...result });
            return res.end();
        }

        const onEvent = async (event) => sendSse(res, event);
        const rawResult = await resolveChatResult(message, normalizePublicHistory(history), "", onEvent);
        const result = normalizeChatResult(rawResult);

        if (!rawResult?.streamed) {
            sendSse(res, { type: "token", token: result.answer });
        }

        sendSse(res, { type: "done", ...result });
        res.end();
    } catch (error) {
        if (res.headersSent) {
            sendSse(res, { type: "error", message: "Không thể tạo phản hồi AI" });
            return res.end();
        }
        next(error);
    }
};

export const getChatHistory = async (req, res, next) => {
    try {
        const session = await ChatSession.findOne({ userId: req.user.id, isActive: true });
        return apiResponse(res, 200, "Chat history retrieved", session ? session.messages : []);
    } catch (error) {
        next(error);
    }
};

export const clearChatHistory = async (req, res, next) => {
    try {
        await ChatSession.updateMany({ userId: req.user.id }, { isActive: false });
        return apiResponse(res, 200, "Chat history cleared");
    } catch (error) {
        next(error);
    }
};

// Export pure function for unit testing
export { classifyChatIntent };
