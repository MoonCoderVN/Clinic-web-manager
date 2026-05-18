import mongoose from "mongoose";
import LeaveRequest from "./leaveRequest.model.js";
import Doctor from "../doctor/doctor.model.js";
import Schedule from "../schedule/schedule.model.js";
import Appointment from "../appointment/appointment.model.js";
import User from "../user/user.model.js";
import apiResponse from "../../utils/apiResponse.js";
import { createNotification } from "../notification/notification.service.js";
import { emitPublic, emitToRole, emitToUser } from "../../realtime/socket.js";
import { toDateKey, toDateOnly } from "./leaveRequest.utils.js";

const ACTIVE_APPOINTMENT_STATUSES = ["pending", "confirmed", "rescheduled", "in_progress"];

const makeHttpError = (statusCode, message, data = null) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.data = data;
    return error;
};

const getMondayKey = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return toDateKey(d);
};

const getDayRange = (date) => {
    const start = toDateOnly(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
};

const today = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
};

const getDoctorProfileByUserId = async (doctorUserId, session = null) => {
    const query = Doctor.findOne({ userId: doctorUserId }).populate("userId", "fullName email");
    if (session) query.session(session);
    return query;
};

const emitLeaveChanged = (action, leaveRequest) => {
    const payload = {
        action,
        leaveRequestId: leaveRequest._id?.toString(),
        doctorUserId: leaveRequest.doctor_id?.toString(),
        date: toDateKey(leaveRequest.date_off),
        status: leaveRequest.status,
    };
    emitToRole("admin", "leave-request:changed", payload);
    emitToUser(leaveRequest.doctor_id, "leave-request:changed", payload);
};

const emitScheduleChanged = (leaveRequest) => {
    const payload = {
        action: "leave-approved",
        doctorUserId: leaveRequest.doctor_id?.toString(),
        weekStart: getMondayKey(leaveRequest.date_off),
        dayOfWeek: new Date(leaveRequest.date_off).getDay(),
    };
    emitToRole("admin", "schedule:changed", payload);
    emitToRole("doctor", "schedule:changed", payload);
    emitToUser(leaveRequest.doctor_id, "schedule:changed", payload);
    emitPublic("slots:changed", payload);
};

const findAffectedAppointments = async (leaveRequest, doctorProfileId, session = null) => {
    const { start, end } = getDayRange(leaveRequest.date_off);
    const query = Appointment.find({
        doctorId: doctorProfileId,
        $or: [
            { appointmentDate: { $gte: start, $lt: end } },
            { date: { $gte: start, $lt: end } },
        ],
        status: { $in: ACTIVE_APPOINTMENT_STATUSES },
    })
        .populate("patientId", "fullName phone")
        .populate("serviceId", "name")
        .sort({ appointmentDate: 1, date: 1, startTime: 1 })
        .lean();
    if (session) query.session(session);
    return query;
};

const serializeConflict = (appointment) => ({
    _id: appointment._id,
    patientName: appointment.patientId?.fullName || "Bệnh nhân",
    patientPhone: appointment.patientId?.phone || "",
    serviceName: appointment.serviceId?.name || "Dịch vụ",
    date: appointment.appointmentDate || appointment.date,
    startTime: appointment.startTime || appointment.timeSlot || "",
    endTime: appointment.endTime || "",
    status: appointment.status,
});

export const createLeaveRequest = async (req, res, next) => {
    try {
        if (req.user.role !== "doctor") {
            return res.status(403).json({ success: false, message: "Chỉ bác sĩ mới có thể gửi đơn xin nghỉ" });
        }

        const dateOff = toDateOnly(req.body.date_off || req.body.date);
        if (!dateOff) {
            return res.status(400).json({ success: false, message: "Ngày nghỉ không hợp lệ" });
        }
        if (dateOff < today()) {
            return res.status(400).json({ success: false, message: "Không thể xin nghỉ cho ngày đã qua" });
        }

        const reason = String(req.body.reason || "").trim();
        if (!reason) {
            return res.status(400).json({ success: false, message: "Vui lòng nhập lý do xin nghỉ" });
        }

        const doctorProfile = await getDoctorProfileByUserId(req.user.id);
        if (!doctorProfile) {
            return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ bác sĩ" });
        }

        const { start, end } = getDayRange(dateOff);
        const existing = await LeaveRequest.findOne({
            doctor_id: req.user.id,
            date_off: { $gte: start, $lt: end },
            status: { $in: ["pending", "approved"] },
        });
        if (existing) {
            return res.status(409).json({ success: false, message: "Ngày này đã có đơn xin nghỉ đang chờ duyệt hoặc đã duyệt" });
        }

        const leaveRequest = await LeaveRequest.create({
            doctor_id: req.user.id,
            reason,
            date_off: dateOff,
        });

        emitLeaveChanged("created", leaveRequest);

        const admins = await User.find({ role: "admin" }).select("_id");
        await Promise.all(admins.map((admin) => createNotification(
            admin._id,
            "system",
            "Đơn xin nghỉ mới",
            `${doctorProfile.userId?.fullName || "Bác sĩ"} gửi đơn xin nghỉ ngày ${dateOff.toLocaleDateString("vi-VN")}.`
        )));

        return apiResponse(res, 201, "Đã gửi đơn xin nghỉ", leaveRequest);
    } catch (error) {
        next(error);
    }
};

export const getMyLeaveRequests = async (req, res, next) => {
    try {
        const requests = await LeaveRequest.find({ doctor_id: req.user.id })
            .populate("reviewedBy", "fullName")
            .sort({ createdAt: -1 });
        return apiResponse(res, 200, "Leave requests retrieved", requests);
    } catch (error) {
        next(error);
    }
};

export const cancelLeaveRequest = async (req, res, next) => {
    try {
        const leaveRequest = await LeaveRequest.findOne({ _id: req.params.id, doctor_id: req.user.id });
        if (!leaveRequest) {
            return res.status(404).json({ success: false, message: "Không tìm thấy đơn xin nghỉ" });
        }
        if (leaveRequest.status !== "pending") {
            return res.status(400).json({ success: false, message: "Chỉ có thể hủy đơn đang chờ duyệt" });
        }
        leaveRequest.status = "cancelled";
        await leaveRequest.save();
        emitLeaveChanged("cancelled", leaveRequest);
        return apiResponse(res, 200, "Đã hủy đơn xin nghỉ");
    } catch (error) {
        next(error);
    }
};

export const getLeaveRequests = async (req, res, next) => {
    try {
        const query = {};
        if (req.query.status && req.query.status !== "all") query.status = req.query.status;
        const requests = await LeaveRequest.find(query)
            .populate("doctor_id", "fullName email phone")
            .populate("reviewedBy", "fullName")
            .sort({ createdAt: -1 });
        return apiResponse(res, 200, "Leave requests retrieved", requests);
    } catch (error) {
        next(error);
    }
};

export const approveLeaveRequest = async (req, res, next) => {
    const session = await mongoose.startSession();
    try {
        let approvedLeaveRequest = null;

        await session.withTransaction(async () => {
            const leaveRequest = await LeaveRequest.findById(req.params.id).session(session);
            if (!leaveRequest) {
                throw makeHttpError(404, "Không tìm thấy đơn xin nghỉ");
            }
            if (leaveRequest.status !== "pending") {
                throw makeHttpError(400, "Chỉ có thể duyệt đơn đang chờ duyệt");
            }
            if (toDateOnly(leaveRequest.date_off) < today()) {
                throw makeHttpError(400, "Không thể duyệt đơn nghỉ cho ngày đã qua");
            }

            const doctorProfile = await getDoctorProfileByUserId(leaveRequest.doctor_id, session);
            if (!doctorProfile) {
                throw makeHttpError(404, "Không tìm thấy hồ sơ bác sĩ");
            }

            const conflicts = await findAffectedAppointments(leaveRequest, doctorProfile._id, session);
            if (conflicts.length > 0) {
                throw makeHttpError(
                    409,
                    "Không thể duyệt nghỉ vì còn lịch hẹn cần xử lý trước",
                    { conflicts: conflicts.map(serializeConflict) }
                );
            }

            await Schedule.findOneAndUpdate(
                {
                    doctorId: leaveRequest.doctor_id,
                    dayOfWeek: new Date(leaveRequest.date_off).getDay(),
                    weekStart: getMondayKey(leaveRequest.date_off),
                },
                {
                    doctorId: leaveRequest.doctor_id,
                    dayOfWeek: new Date(leaveRequest.date_off).getDay(),
                    weekStart: getMondayKey(leaveRequest.date_off),
                    startTime: "00:00",
                    endTime: "00:00",
                    maxSlots: 0,
                    isOff: true,
                },
                { new: true, upsert: true, runValidators: true, session }
            );

            leaveRequest.status = "approved";
            leaveRequest.reviewedBy = req.user.id;
            leaveRequest.reviewedAt = new Date();
            leaveRequest.reviewNote = String(req.body.reviewNote || "").trim();
            await leaveRequest.save({ session });
            approvedLeaveRequest = leaveRequest;
        });

        emitLeaveChanged("approved", approvedLeaveRequest);
        emitScheduleChanged(approvedLeaveRequest);
        await createNotification(
            approvedLeaveRequest.doctor_id,
            "system",
            "Đơn xin nghỉ đã được duyệt",
            `Đơn xin nghỉ ngày ${new Date(approvedLeaveRequest.date_off).toLocaleDateString("vi-VN")} đã được duyệt.`
        );

        return apiResponse(res, 200, "Đã duyệt đơn xin nghỉ", approvedLeaveRequest);
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
                ...(error.data ? { data: error.data } : {}),
            });
        }
        next(error);
    } finally {
        await session.endSession();
    }
};

export const rejectLeaveRequest = async (req, res, next) => {
    try {
        const leaveRequest = await LeaveRequest.findById(req.params.id);
        if (!leaveRequest) {
            return res.status(404).json({ success: false, message: "Không tìm thấy đơn xin nghỉ" });
        }
        if (leaveRequest.status !== "pending") {
            return res.status(400).json({ success: false, message: "Chỉ có thể từ chối đơn đang chờ duyệt" });
        }

        leaveRequest.status = "rejected";
        leaveRequest.reviewedBy = req.user.id;
        leaveRequest.reviewedAt = new Date();
        leaveRequest.reviewNote = String(req.body.reviewNote || "").trim();
        await leaveRequest.save();

        emitLeaveChanged("rejected", leaveRequest);
        await createNotification(
            leaveRequest.doctor_id,
            "system",
            "Đơn xin nghỉ bị từ chối",
            `Đơn xin nghỉ ngày ${new Date(leaveRequest.date_off).toLocaleDateString("vi-VN")} đã bị từ chối.${leaveRequest.reviewNote ? ` Lý do: ${leaveRequest.reviewNote}` : ""}`
        );

        return apiResponse(res, 200, "Đã từ chối đơn xin nghỉ", leaveRequest);
    } catch (error) {
        next(error);
    }
};
