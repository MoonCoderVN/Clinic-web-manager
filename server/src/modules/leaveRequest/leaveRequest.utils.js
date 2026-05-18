import LeaveRequest from "./leaveRequest.model.js";

export const toDateOnly = (value) => {
    if (!value) return null;
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split("-").map(Number);
        const date = new Date(year, month - 1, day);
        date.setHours(0, 0, 0, 0);
        return date;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
};

export const toDateKey = (value) => {
    const date = toDateOnly(value);
    if (!date) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

export const getApprovedLeaveForDate = async (doctorUserId, dateValue) => {
    const date = toDateOnly(dateValue);
    if (!doctorUserId || !date) return null;

    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    return LeaveRequest.findOne({
        doctor_id: doctorUserId,
        date_off: { $gte: date, $lt: nextDay },
        status: "approved",
    }).lean();
};

export const isDoctorOffOnDate = async (doctorUserId, dateValue) =>
    Boolean(await getApprovedLeaveForDate(doctorUserId, dateValue));

export const filterSlotsByApprovedLeave = async (slots, doctorUserId, dateValue) => {
    const isOff = await isDoctorOffOnDate(doctorUserId, dateValue);
    return isOff ? [] : slots;
};
