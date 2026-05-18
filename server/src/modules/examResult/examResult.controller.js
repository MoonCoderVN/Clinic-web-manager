import ExamResult from "./examResult.model.js";
import Appointment from "../appointment/appointment.model.js";
import Doctor from "../doctor/doctor.model.js";
import User from "../user/user.model.js";
import fs from "fs/promises";
import apiResponse from "../../utils/apiResponse.js";
import { createNotification } from "../notification/notification.service.js";
import { sendEmail } from "../../utils/sendEmail.js";
import { nextDateReminderTemplate } from "../../utils/emailTemplates.js";
import { emitAppointmentChanged, emitToRole, emitToUser } from "../../realtime/socket.js";
import { localUploadPathFromPublicPath, toDentalRecordPublicPath } from "../../config/uploadPaths.js";

const BOOKING_URL = `${process.env.CLIENT_URL || "http://localhost:5173"}/patient/book`;
const EXAM_RESULT_ALLOWED_APPOINTMENT_STATUSES = ["confirmed", "in_progress"];

const canAccessExamResult = async (req, examResult) => {
    if (req.user.role === "admin") return true;
    if (req.user.role === "patient") return String(examResult.patientId) === String(req.user.id);
    if (req.user.role === "doctor") {
        const appointment = await Appointment.findById(examResult.appointmentId).select("doctorId");
        const doctorProfile = await Doctor.findOne({ userId: req.user.id }).select("_id");
        return !!doctorProfile && String(appointment?.doctorId) === String(doctorProfile._id);
    }
    return false;
};

// ──────────────────────────────────────────────────────────────────
// POST /exam-results — Tạo kết quả khám (doctor only)
// ──────────────────────────────────────────────────────────────────
export const createExamResult = async (req, res, next) => {
    try {
        const { appointmentId, diagnosis, treatment, treatmentPlan, prescription, note, notes, nextDate } = req.body;

        if (!appointmentId || !diagnosis || !treatment) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng cung cấp appointmentId, chẩn đoán và phương pháp điều trị"
            });
        }

        // Verify appointment tồn tại
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ success: false, message: "Không tìm thấy lịch hẹn" });
        }

        // Verify ownership — bác sĩ chỉ nhập kết quả cho appointment của mình
        const doctorProfile = await Doctor.findOne({ userId: req.user.id });
        if (doctorProfile && appointment.doctorId.toString() !== doctorProfile._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền nhập kết quả cho lịch hẹn này"
            });
        }

        if (!EXAM_RESULT_ALLOWED_APPOINTMENT_STATUSES.includes(appointment.status)) {
            return res.status(400).json({
                success: false,
                message: "Chỉ có thể nhập kết quả khi lịch hẹn đã xác nhận hoặc đang khám",
            });
        }

        // Check if exam result already exists
        const existing = await ExamResult.findOne({ appointmentId });
        if (existing) {
            return res.status(400).json({ success: false, message: "Kết quả đã được nhập cho lịch hẹn này" });
        }

        // Create exam result
        const examResult = await ExamResult.create({
            appointmentId,
            patientId: appointment.patientId,
            diagnosis,
            treatment,
            treatmentPlan,
            prescription,
            note,
            notes,
            nextDate: nextDate ? new Date(nextDate) : undefined,
        });

        // Mark appointment as completed and store diagnosis
        await Appointment.findByIdAndUpdate(appointmentId, {
            status: "completed",
            diagnosis,
        });
        const completedAppointment = await Appointment.findById(appointmentId);

        // ── Thông báo ngày tái khám nếu bác sĩ đặt nextDate ──
        if (nextDate) {
            const nextDateObj = new Date(nextDate);
            const daysLeft = Math.ceil((nextDateObj - new Date()) / (1000 * 60 * 60 * 24));
            const nextDateFormatted = nextDateObj.toLocaleDateString("vi-VN", {
                weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
            });

            // Lấy email patient để gửi mail
            const patientUser = await User.findById(appointment.patientId).select("fullName email")
                .catch(() => null);

            // In-app notification cho patient
            await createNotification(
                appointment.patientId,
                "reminder",
                "Lịch tái khám của bạn",
                `Bác sĩ đề nghị bạn tái khám vào ${nextDateFormatted}. Nhớ đặt lịch trước để được ưu tiên.`
            );

            // Email ngay lập tức cho patient
            if (patientUser?.email) {
                const { subject, html } = nextDateReminderTemplate({
                    patientName: patientUser.fullName || "Bạn",
                    diagnosis,
                    nextDateStr: nextDateFormatted,
                    daysLeft,
                    bookingUrl: BOOKING_URL,
                });
                await sendEmail(patientUser.email, subject, html);
            }

            // In-app notification cho bác sĩ
            if (doctorProfile?.userId) {
                await createNotification(
                    doctorProfile.userId,
                    "reminder",
                    "Nhắc tái khám bệnh nhân",
                    `Bệnh nhân cần tái khám vào ${nextDateFormatted}. Kiểm tra lại khi đến ngày.`
                );
            }
        }

        const populated = await ExamResult.findById(examResult._id)
            .populate({
                path: "appointmentId",
                populate: {
                    path: "patientId",
                    select: "fullName email phone"
                }
            });

        const payload = {
            action: "created",
            examResultId: examResult._id?.toString(),
            appointmentId: appointmentId?.toString(),
            patientId: appointment.patientId?.toString(),
        };
        emitToRole("admin", "exam-result:changed", payload);
        emitToUser(appointment.patientId, "exam-result:changed", payload);
        if (doctorProfile?.userId) emitToUser(doctorProfile.userId, "exam-result:changed", payload);
        await emitAppointmentChanged(completedAppointment, "completed");

        return apiResponse(res, 201, "Lưu kết quả khám thành công", populated);
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// GET /exam-results/appointment/:appointmentId
// ──────────────────────────────────────────────────────────────────
export const getByAppointment = async (req, res, next) => {
    try {
        const examResult = await ExamResult.findOne({ appointmentId: req.params.appointmentId });
        if (!examResult) return res.status(404).json({ success: false, message: "Chưa có kết quả khám" });
        if (!(await canAccessExamResult(req, examResult))) {
            return res.status(403).json({ success: false, message: "Bạn không có quyền xem hồ sơ này" });
        }
        return apiResponse(res, 200, "Examination result retrieved", examResult);
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// PUT /exam-results/:id
// ──────────────────────────────────────────────────────────────────
export const updateExamResult = async (req, res, next) => {
    try {
        const allowed = ["diagnosis", "treatment", "treatmentPlan", "prescription", "note", "notes", "nextDate"];
        const update = {};
        allowed.forEach((field) => {
            if (req.body[field] !== undefined) update[field] = req.body[field];
        });
        const currentExamResult = await ExamResult.findById(req.params.id);
        if (!currentExamResult) return res.status(404).json({ success: false, message: "Không tìm thấy kết quả khám" });
        if (!(await canAccessExamResult(req, currentExamResult))) {
            return res.status(403).json({ success: false, message: "Bạn không có quyền cập nhật hồ sơ này" });
        }
        const examResult = await ExamResult.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!examResult) return res.status(404).json({ success: false, message: "Không tìm thấy kết quả khám" });
        let updatedAppointment = null;
        if (update.diagnosis !== undefined && examResult.appointmentId) {
            updatedAppointment = await Appointment.findByIdAndUpdate(
                examResult.appointmentId,
                { $set: { diagnosis: update.diagnosis } },
                { new: true }
            );
        }
        emitToRole("admin", "exam-result:changed", {
            action: "updated",
            examResultId: examResult._id?.toString(),
            patientId: examResult.patientId?.toString(),
        });
        emitToUser(examResult.patientId, "exam-result:changed", {
            action: "updated",
            examResultId: examResult._id?.toString(),
        });
        if (updatedAppointment) {
            await emitAppointmentChanged(updatedAppointment, "exam-result-updated");
        }
        return apiResponse(res, 200, "Examination result updated", examResult);
    } catch (error) {
        next(error);
    }
};

export const uploadExamAttachment = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Vui lòng chọn file" });
        }

        const examResult = await ExamResult.findById(req.params.id);
        if (!examResult) {
            return res.status(404).json({ success: false, message: "Không tìm thấy kết quả khám" });
        }
        if (!(await canAccessExamResult(req, examResult))) {
            return res.status(403).json({ success: false, message: "Bạn không có quyền cập nhật hồ sơ này" });
        }

        const type = req.body.type || (req.file.mimetype === "application/pdf" ? "document" : "image");
        examResult.attachments.push({
            fileName: req.file.filename,
            originalName: req.file.originalname,
            fileUrl: toDentalRecordPublicPath(req.file.filename),
            mimeType: req.file.mimetype,
            fileSize: req.file.size,
            type,
            uploadedBy: req.user.id,
        });
        await examResult.save();

        return apiResponse(res, 201, "Đã upload tệp hồ sơ nha khoa", examResult);
    } catch (error) {
        next(error);
    }
};

export const deleteExamAttachment = async (req, res, next) => {
    try {
        const examResult = await ExamResult.findById(req.params.id);
        if (!examResult) {
            return res.status(404).json({ success: false, message: "Không tìm thấy kết quả khám" });
        }
        if (!(await canAccessExamResult(req, examResult))) {
            return res.status(403).json({ success: false, message: "Bạn không có quyền cập nhật hồ sơ này" });
        }

        const attachment = examResult.attachments.id(req.params.attachmentId);
        if (!attachment) {
            return res.status(404).json({ success: false, message: "Không tìm thấy tệp đính kèm" });
        }

        const fileUrl = attachment.fileUrl;
        examResult.attachments.pull({ _id: req.params.attachmentId });
        await examResult.save();

        if (fileUrl?.startsWith("/uploads/dental-records/")) {
            const localPath = localUploadPathFromPublicPath(fileUrl);
            if (localPath) {
                await fs.unlink(localPath).catch((error) => {
                    if (error?.code !== "ENOENT") throw error;
                });
            }
        }

        return apiResponse(res, 200, "Đã xoá tệp hồ sơ nha khoa", examResult);
    } catch (error) {
        next(error);
    }
};

export const deleteExamResult = async (req, res, next) => {
    try {
        const examResult = await ExamResult.findById(req.params.id);
        if (!examResult) {
            return res.status(404).json({ success: false, message: "Không tìm thấy kết quả khám" });
        }

        const appointment = await Appointment.findById(examResult.appointmentId);
        if (!appointment) {
            return res.status(404).json({ success: false, message: "Không tìm thấy lịch hẹn" });
        }

        let doctorProfile = null;
        if (req.user.role === "doctor") {
            doctorProfile = await Doctor.findOne({ userId: req.user.id });
            if (!doctorProfile || appointment.doctorId.toString() !== doctorProfile._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: "Bạn không có quyền xoá kết quả cho lịch hẹn này"
                });
            }
        } else if (appointment.doctorId) {
            doctorProfile = await Doctor.findById(appointment.doctorId).select("userId");
        }

        await ExamResult.findByIdAndDelete(examResult._id);

        const updatedAppointment = await Appointment.findByIdAndUpdate(
            appointment._id,
            {
                $set: { status: "confirmed" },
                $unset: { diagnosis: "" },
            },
            { new: true }
        );

        const payload = {
            action: "deleted",
            examResultId: examResult._id?.toString(),
            appointmentId: appointment._id?.toString(),
            patientId: appointment.patientId?.toString(),
        };
        emitToRole("admin", "exam-result:changed", payload);
        emitToUser(appointment.patientId, "exam-result:changed", payload);
        if (doctorProfile?.userId) emitToUser(doctorProfile.userId, "exam-result:changed", payload);
        await emitAppointmentChanged(updatedAppointment, "exam-result-deleted");

        return apiResponse(res, 200, "Xoá kết quả khám thành công", {
            appointmentId: appointment._id,
            status: "confirmed",
        });
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// GET /exam-results/by-patient?patientId=xxx (doctor/admin)
// ──────────────────────────────────────────────────────────────────
export const getByPatient = async (req, res, next) => {
    try {
        const { patientId } = req.query;
        if (!patientId) {
            return res.status(400).json({ success: false, message: "Thiếu patientId" });
        }
        if (req.user.role === "patient" && String(patientId) !== String(req.user.id)) {
            return res.status(403).json({ success: false, message: "Bạn không có quyền xem hồ sơ của bệnh nhân khác" });
        }

        const appointmentFilter = { patientId };
        if (req.user.role === "doctor") {
            const doctorProfile = await Doctor.findOne({ userId: req.user.id }).select("_id");
            if (!doctorProfile) {
                return apiResponse(res, 200, "Lấy kết quả thành công", []);
            }
            appointmentFilter.doctorId = doctorProfile._id;
        }

        // Lấy appointments của patient trong phạm vi quyền hiện tại
        const appointments = await Appointment.find(appointmentFilter).select("_id");
        const appointmentIds = appointments.map(a => a._id);

        if (appointmentIds.length === 0) {
            return apiResponse(res, 200, "Lấy kết quả thành công", []);
        }

        const examResults = await ExamResult.find({
            appointmentId: { $in: appointmentIds }
        }).populate({
            path: "appointmentId",
            select: "appointmentDate date startTime timeSlot doctorId",
            populate: {
                path: "doctorId",
                select: "userId",
                populate: {
                    path: "userId",
                    select: "fullName"
                }
            }
        }).sort({ createdAt: -1 });

        const results = examResults.map(r => {
            const appt = r.appointmentId;
            const apptDate = appt?.appointmentDate || appt?.date;
            return {
                _id: r._id,
                diagnosis: r.diagnosis,
                treatment: r.treatment,
                treatmentPlan: r.treatmentPlan,
                prescription: r.prescription,
                note: r.note || r.notes,
                nextDate: r.nextDate || null,
                attachments: r.attachments || [],
                date: apptDate
                    ? new Date(apptDate).toLocaleDateString("vi-VN")
                    : "—",
                doctorName: appt?.doctorId?.userId?.fullName || "Bác sĩ",
            };
        });

        return apiResponse(res, 200, "Lấy kết quả thành công", results);
    } catch (error) {
        next(error);
    }
};
