import Patient from "./patient.model.js";
import Appointment from "../appointment/appointment.model.js";
import ExamResult from "../examResult/examResult.model.js";
import Doctor from "../doctor/doctor.model.js";
import apiResponse from "../../utils/apiResponse.js";

const formatDate = (value) => value ? new Date(value).toLocaleDateString("vi-VN") : "—";

const buildHistoryBase = (appointment) => {
    const apptDate = appointment?.appointmentDate || appointment?.date;
    return {
        appointmentId: appointment?._id,
        appointmentDate: apptDate || null,
        date: formatDate(apptDate),
        time: appointment?.startTime || appointment?.timeSlot || "",
        doctorName: appointment?.doctorId?.userId?.fullName || "Bác sĩ",
        serviceName: appointment?.serviceId?.name || "Dịch vụ nha khoa",
    };
};

export const getPatientProfile = async (req, res, next) => {
    try {
        let patient = await Patient.findOne({ userId: req.user.id }).populate("userId", "fullName email phone avatar");
        if (!patient && req.user.role === "patient") {
            patient = await Patient.create({ userId: req.user.id });
            console.warn(`[Patient] Auto-created missing profile for user ${req.user.id}`);
            patient = await patient.populate("userId", "fullName email phone avatar");
        }
        if (!patient) return res.status(404).json({ success: false, message: "Patient profile not found" });
        return apiResponse(res, 200, "Patient profile retrieved", patient);
    } catch (error) {
        next(error);
    }
};

export const updatePatientProfile = async (req, res, next) => {
    try {
        const { dateOfBirth, gender, address, medicalHistory, allergies } = req.body;
        const allowedFields = {};
        if (dateOfBirth !== undefined) allowedFields.dateOfBirth = dateOfBirth;
        if (gender !== undefined) allowedFields.gender = gender;
        if (address !== undefined) allowedFields.address = address;
        if (medicalHistory !== undefined) allowedFields.medicalHistory = medicalHistory;
        if (allergies !== undefined) allowedFields.allergies = allergies;

        const patient = await Patient.findOneAndUpdate(
            { userId: req.user.id },
            { $set: allowedFields },
            { new: true, runValidators: true, upsert: req.user.role === "patient", setDefaultsOnInsert: true }
        );
        return apiResponse(res, 200, "Patient profile updated", patient);
    } catch (error) {
        next(error);
    }
};

export const getPatientProfileForDoctor = async (req, res, next) => {
    try {
        const { patientId } = req.query;
        if (!patientId) {
            return res.status(400).json({ success: false, message: "Thiếu patientId" });
        }

        if (req.user.role === "doctor") {
            const doctorProfile = await Doctor.findOne({ userId: req.user.id }).select("_id");
            if (!doctorProfile) {
                return res.status(403).json({ success: false, message: "Không có quyền xem hồ sơ bệnh nhân này" });
            }

            const hasAppointment = await Appointment.exists({
                doctorId: doctorProfile._id,
                patientId,
            });

            if (!hasAppointment) {
                return res.status(403).json({ success: false, message: "Không có quyền xem hồ sơ bệnh nhân này" });
            }
        }

        const patient = await Patient.findOne({ userId: patientId })
            .populate("userId", "fullName email phone avatar");

        if (!patient) {
            return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ bệnh nhân" });
        }

        return apiResponse(res, 200, "Lấy hồ sơ bệnh nhân thành công", {
            user: patient.userId,
            patientProfile: {
                dateOfBirth: patient.dateOfBirth,
                gender: patient.gender,
                address: patient.address,
                medicalHistory: patient.medicalHistory || [],
                allergies: patient.allergies || [],
            },
        });
    } catch (error) {
        next(error);
    }
};

export const getAppointmentHistory = async (req, res, next) => {
    try {
        const appointments = await Appointment.find({ patientId: req.user.id })
            .populate({ path: "doctorId", populate: { path: "userId", select: "fullName email phone avatar" } })
            .populate("serviceId", "name price duration")
            .sort({ createdAt: -1 });
        return apiResponse(res, 200, "Appointment history retrieved", appointments);
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// GET /patients/me/exam-results — Lịch sử kết quả khám của patient
// ──────────────────────────────────────────────────────────────────
export const getMyExamResults = async (req, res, next) => {
    try {
        // Bước 1: Lấy tất cả appointments của patient
        const appointments = await Appointment.find({ patientId: req.user.id })
            .populate({ path: "doctorId", populate: { path: "userId", select: "fullName" } })
            .populate("serviceId", "name")
            .sort({ appointmentDate: -1, date: -1, createdAt: -1 });
        const appointmentIds = appointments.map(a => a._id);

        // Bước 2: Lấy exam results theo appointmentIds
        const examResults = await ExamResult.find({
            $or: [
                { appointmentId: { $in: appointmentIds } },
                { patientId: req.user.id },
            ],
        }).populate({
            path: "appointmentId",
            select: "appointmentDate date startTime timeSlot doctorId serviceId",
            populate: [
                {
                    path: "doctorId",
                    select: "userId",
                    populate: {
                        path: "userId",
                        select: "fullName"
                    }
                },
                { path: "serviceId", select: "name" },
            ],
        }).sort({ createdAt: -1 });

        // Bước 3: Map ra format thân thiện
        const resultsByAppointmentId = new Map();
        const results = examResults.map(r => {
            const appt = r.appointmentId;
            if (appt?._id) resultsByAppointmentId.set(appt._id.toString(), r);
            const base = buildHistoryBase(appt);
            const apptDate = appt?.appointmentDate || appt?.date;
            return {
                _id: r._id,
                appointmentId: base.appointmentId,
                type: "exam_result",
                hasExamResult: true,
                diagnosis: r.diagnosis,
                treatment: r.treatment,
                treatmentPlan: r.treatmentPlan,
                prescription: r.prescription,
                note: r.note || r.notes,
                nextDate: r.nextDate || null,
                attachments: r.attachments || [],
                createdAt: r.createdAt,
                date: apptDate
                    ? new Date(apptDate).toLocaleDateString("vi-VN")
                    : "—",
                doctorName: appt?.doctorId?.userId?.fullName || "Bác sĩ",
                ...base,
            };
        });

        const completedWithoutResult = appointments
            .filter((appointment) =>
                appointment.status === "completed" &&
                !resultsByAppointmentId.has(appointment._id.toString())
            )
            .map((appointment) => ({
                _id: `appointment-${appointment._id}`,
                appointmentId: appointment._id,
                type: "completed_appointment",
                hasExamResult: false,
                diagnosis: appointment.diagnosis || "Chưa có kết quả chi tiết",
                treatment: "",
                prescription: "",
                note: "",
                nextDate: null,
                createdAt: appointment.createdAt,
                ...buildHistoryBase(appointment),
            }));

        const history = [...results, ...completedWithoutResult].sort((a, b) => {
            const aDate = new Date(a.appointmentDate || a.createdAt || 0).getTime();
            const bDate = new Date(b.appointmentDate || b.createdAt || 0).getTime();
            return bDate - aDate;
        });

        return apiResponse(res, 200, "Lấy lịch sử khám thành công", history);
    } catch (error) {
        next(error);
    }
};
