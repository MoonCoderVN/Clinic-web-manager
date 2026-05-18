import User from "../user/user.model.js";
import Appointment from "../appointment/appointment.model.js";
import Service from "../service/service.model.js";
import Doctor from "../doctor/doctor.model.js";
import Patient from "../patient/patient.model.js";
import apiResponse from "../../utils/apiResponse.js";
import { emitPublic, emitToRole, emitToUser } from "../../realtime/socket.js";
import { createSimplePdf } from "../../utils/simplePdf.js";

const emitAdminUserChanged = (action, user) => {
    const userId = user?._id || user?.id;
    const payload = { action, userId: userId?.toString(), role: user?.role };
    emitToRole("admin", "user:changed", payload);
    emitToUser(userId, "profile:changed", payload);
    if (user?.role === "patient") emitToRole("admin", "patient:changed", payload);
    if (user?.role === "doctor") {
        emitToRole("admin", "doctor:changed", payload);
        emitPublic("doctor:changed", payload);
        emitPublic("public:landing-changed", { source: "doctor", action });
    }
};

// ──────────────────────────────────────────────────────────────────
// GET /admin/stats — Dashboard summary stats
// ──────────────────────────────────────────────────────────────────
export const getStats = async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [
            totalAppointments,
            todayAppointments,
            pendingAppointments,
            completedAppointments,
            cancelledAppointments,
            confirmedAppointments,
            totalPatients,
            totalDoctors,
            totalServices,
        ] = await Promise.all([
            Appointment.countDocuments(),
            Appointment.countDocuments({
                $or: [
                    { appointmentDate: { $gte: today, $lt: tomorrow } },
                    { date: { $gte: today, $lt: tomorrow } },
                ],
            }),
            Appointment.countDocuments({ status: "pending" }),
            Appointment.countDocuments({ status: "completed" }),
            Appointment.countDocuments({ status: "cancelled" }),
            Appointment.countDocuments({ status: "confirmed" }),
            User.countDocuments({ role: "patient" }),
            User.countDocuments({ role: "doctor" }),
            Service.countDocuments({ isActive: true }),
        ]);

        return apiResponse(res, 200, "Admin stats retrieved", {
            totalAppointments,
            todayAppointments,
            pendingAppointments,
            completedAppointments,
            cancelledAppointments,
            confirmedAppointments,
            totalPatients,
            totalDoctors,
            totalServices,
        });
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// GET /admin/reports — Chart data for admin analytics
// Query params:
//   type=day|month  (group by day of month OR by month)
//   year=2024
//   month=4         (required when type=day)
//   period=week|month|quarter|year  (alternative simple mode)
// ──────────────────────────────────────────────────────────────────
export const getReports = async (req, res, next) => {
    try {
        const { type = "month", year, month, period } = req.query;

        const now = new Date();
        const targetYear = parseInt(year) || now.getFullYear();
        const targetMonth = parseInt(month) || (now.getMonth() + 1);

        let start, end;

        if (type === "day") {
            // Group by day within a specific month
            start = new Date(targetYear, targetMonth - 1, 1);
            end = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
        } else {
            if (period === "week") {
                start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                end = now;
            } else if (period === "month") {
                start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                end = now;
            } else if (period === "quarter") {
                start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                end = now;
            } else {
                start = new Date(targetYear, 0, 1);
                end = new Date(targetYear, 11, 31, 23, 59, 59);
            }
        }

        const effectiveDateStage = {
            $addFields: {
                effectiveDate: { $ifNull: ["$appointmentDate", "$date"] },
            },
        };

        const dateMatch = {
            $match: {
                effectiveDate: { $gte: start, $lte: end },
            },
        };

        const isDailyGrouping = type === "day" || period === "week" || period === "month";
        const groupKey = isDailyGrouping
            ? { $dayOfMonth: "$effectiveDate" }
            : { $month: "$effectiveDate" };

        const rawData = await Appointment.aggregate([
            effectiveDateStage,
            dateMatch,
            {
                $group: {
                    _id: groupKey,
                    total: { $sum: 1 },
                    completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
                    pending: { $sum: { $cond: [{ $in: ["$status", ["pending", "rescheduled"]] }, 1, 0] } },
                    confirmed: { $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] } },
                    inProgress: { $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] } },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // ── Service distribution (pie chart) ──
        const serviceDistribution = await Appointment.aggregate([
            effectiveDateStage,
            dateMatch,
            { $match: { status: { $nin: ["cancelled"] } } },
            { $group: { _id: "$serviceId", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "services",
                    localField: "_id",
                    foreignField: "_id",
                    as: "service",
                },
            },
            { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    name: { $ifNull: ["$service.name", "Khác"] },
                    value: "$count",
                },
            },
        ]);

        // ── Appointments by status ──
        const appointmentsByStatus = (await Appointment.aggregate([
            effectiveDateStage,
            dateMatch,
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ])).map((s) => ({
            status: s._id,
            count: s.count,
        }));

        const operationalSummaryRaw = await Appointment.aggregate([
            effectiveDateStage,
            dateMatch,
            {
                $lookup: {
                    from: "services",
                    localField: "serviceId",
                    foreignField: "_id",
                    as: "service",
                },
            },
            { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
                    estimatedRevenue: {
                        $sum: {
                            $cond: [
                                { $eq: ["$status", "completed"] },
                                { $ifNull: ["$service.price", 0] },
                                0,
                            ],
                        },
                    },
                },
            },
        ]);
        const operationalBase = operationalSummaryRaw[0] || {};
        const operationalSummary = {
            totalAppointments: operationalBase.total || 0,
            completedAppointments: operationalBase.completed || 0,
            cancelledAppointments: operationalBase.cancelled || 0,
            estimatedRevenue: operationalBase.estimatedRevenue || 0,
            cancellationRate: operationalBase.total
                ? Number(((operationalBase.cancelled / operationalBase.total) * 100).toFixed(1))
                : 0,
        };

        const topDoctors = await Appointment.aggregate([
            effectiveDateStage,
            dateMatch,
            { $group: { _id: "$doctorId", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "doctors",
                    localField: "_id",
                    foreignField: "_id",
                    as: "doctor",
                },
            },
            { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "users",
                    localField: "doctor.userId",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    name: { $ifNull: ["$user.fullName", "Bác sĩ"] },
                    specialization: "$doctor.specialization",
                    count: 1,
                },
            },
        ]);

        const topServices = await Appointment.aggregate([
            effectiveDateStage,
            dateMatch,
            { $group: { _id: "$serviceId", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "services",
                    localField: "_id",
                    foreignField: "_id",
                    as: "service",
                },
            },
            { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    name: { $ifNull: ["$service.name", "Dịch vụ"] },
                    price: { $ifNull: ["$service.price", 0] },
                    count: 1,
                },
            },
        ]);

        // ── Main Chart Data (monthlyAppointments for UI) ──
        const mainChartPipeline = [
            effectiveDateStage,
            dateMatch,
            {
                $lookup: {
                    from: "services",
                    localField: "serviceId",
                    foreignField: "_id",
                    as: "service",
                },
            },
            { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: groupKey,
                    count: { $sum: 1 },
                    revenue: {
                        $sum: {
                            $cond: [
                                { $eq: ["$status", "completed"] },
                                { $ifNull: ["$service.price", 0] },
                                0,
                            ],
                        },
                    },
                },
            },
            { $sort: { _id: 1 } },
        ];
        
        const monthNames = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];
        const mainChartRaw = await Appointment.aggregate(mainChartPipeline);

        const monthlyAppointments = mainChartRaw.map((m) => ({
            month: isDailyGrouping ? `Ngày ${m._id}` : monthNames[(m._id || 1) - 1],
            count: m.count,
            revenue: m.revenue || 0,
        }));

        // ── Patient growth (cumulative by month) ──
        const patientPipeline = [
            { $match: { role: "patient", createdAt: { $lte: end } } },
            {
                $group: {
                    _id: { $month: { $toDate: "$createdAt" } },
                    newPatients: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ];
        let cumulativePatients = 0;
        const patientRaw = await User.aggregate(patientPipeline);
        const patientGrowth = patientRaw.map((p) => {
            cumulativePatients += p.newPatients;
            return { month: monthNames[(p._id || 1) - 1], patients: cumulativePatients };
        });

        // Weekly trend: current calendar week (Monday -> Sunday)
        const days = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
        const weekStart = new Date(now);
        const currentDay = weekStart.getDay(); // 0=Sun, 1=Mon
        const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
        weekStart.setDate(weekStart.getDate() - daysSinceMonday);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        const weeklyRaw = await Appointment.aggregate([
            effectiveDateStage,
            { $match: { effectiveDate: { $gte: weekStart, $lte: weekEnd } } },
            {
                $group: {
                    _id: { $dayOfWeek: "$effectiveDate" },
                    appointments: { $sum: 1 },
                },
            },
        ]);
        const weeklyTrend = days.map((day, i) => {
            const dayNum = i === 6 ? 1 : i + 2; // MongoDB $dayOfWeek: 1=Sun, 2=Mon
            const found = weeklyRaw.find((w) => w._id === dayNum);
            return { day, appointments: found?.appointments || 0 };
        });

        return apiResponse(res, 200, "Report data retrieved", {
            type,
            month: targetMonth,
            year: targetYear,
            data: rawData,
            // Rich chart data
            monthlyAppointments,
            serviceDistribution,
            appointmentsByStatus,
            patientGrowth,
            weeklyTrend,
            operationalSummary,
            topDoctors,
            topServices,
        });
    } catch (error) {
        next(error);
    }
};

export const exportReportsPdf = async (req, res, next) => {
    try {
        const originalJson = res.json.bind(res);
        let reportPayload = null;
        res.json = (payload) => {
            reportPayload = payload?.data || payload;
            return res;
        };
        await getReports(req, res, next);
        res.json = originalJson;
        if (!reportPayload) return;

        const summary = reportPayload.operationalSummary || {};
        const lines = [
            `Generated: ${new Date().toISOString()}`,
            `Report type: ${reportPayload.type || ""}`,
            `Year: ${reportPayload.year || ""}`,
            `Month: ${reportPayload.month || ""}`,
            "",
            `Revenue summary: ${summary.estimatedRevenue || 0} VND`,
            `Total appointments: ${summary.totalAppointments || 0}`,
            `Completed appointments: ${summary.completedAppointments || 0}`,
            `Cancelled appointments: ${summary.cancelledAppointments || 0}`,
            `Cancellation rate: ${summary.cancellationRate || 0}%`,
            "",
            "Appointments by status:",
            ...(reportPayload.appointmentsByStatus || []).map((item) => `- ${item.status}: ${item.count}`),
            "",
            "Top doctors:",
            ...(reportPayload.topDoctors || []).map((item) => `- ${item.name}: ${item.count}`),
            "",
            "Top services:",
            ...(reportPayload.topServices || []).map((item) => `- ${item.name}: ${item.count}`),
        ].slice(0, 45);

        const pdf = createSimplePdf("DentaCare Admin Report", lines);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="dentacare-report-${Date.now()}.pdf"`);
        return res.send(pdf);
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// POST /admin/patients — Create new patient
// ──────────────────────────────────────────────────────────────────
export const createPatient = async (req, res, next) => {
    try {
        const { fullName, email, phone, password, dateOfBirth, gender, address } = req.body;

        if (!fullName || !email) {
            return res.status(400).json({ success: false, message: "Họ tên và email là bắt buộc" });
        }

        // Check email exists
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(409).json({ success: false, message: "Email đã được sử dụng" });
        }

        // BUG FIX: pass plain password — pre-save hook tự hash.
        // Code cũ hash thủ công → User.create → pre-save hook hash lần nữa = double hash
        const rawPassword = password || "Dentacare@123";

        const user = await User.create({
            fullName,
            email,
            phone: phone || "",
            password: rawPassword,
            role: "patient",
            isActive: true,
        });

        // Create patient profile
        const patientProfile = await Patient.create({
            userId: user._id,
            dateOfBirth: dateOfBirth || null,
            gender: gender || "",
            address: address || "",
        });

        const { password: _, ...userObj } = user.toObject();
        emitAdminUserChanged("patient-created", user);
        return apiResponse(res, 201, "Tạo bệnh nhân thành công", {
            ...userObj,
            patientProfile,
        });
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// POST /admin/create-doctor — Admin tạo tài khoản bác sĩ mới
// ──────────────────────────────────────────────────────────────────
export const createDoctor = async (req, res, next) => {
    try {
        const { fullName, email, password, phone, specialty, experience, bio } = req.body;

        if (!fullName || !email || !password || !specialty) {
            return res.status(400).json({ success: false, message: "fullName, email, password và specialty là bắt buộc" });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(409).json({ success: false, message: "Email đã được sử dụng" });
        }

        // BUG FIX: pass plain password — pre-save hook tự hash
        const user = await User.create({
            fullName,
            email,
            phone: phone || "",
            password,
            role: "doctor",
            isActive: true,
        });

        await Doctor.create({
            userId: user._id,
            specialization: specialty,   // model dùng "specialization", không phải "specialty"
            specialty,
            licenseNumber: `BS-${Date.now()}`,
            experience: parseInt(experience) || 0,
            bio: bio || "",
            schedule: [],
        });

        const { password: _, ...userObj } = user.toObject();
        emitAdminUserChanged("doctor-created", user);
        return apiResponse(res, 201, "Tạo tài khoản bác sĩ thành công", userObj);
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// GET /admin/users — List all users (admin portal)
// ──────────────────────────────────────────────────────────────────
export const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find().select("-password");
        return apiResponse(res, 200, "All users retrieved", users);
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// PATCH /admin/users/:id/toggle — Toggle user active status
// ──────────────────────────────────────────────────────────────────
export const toggleUserStatus = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        user.isActive = !user.isActive;
        await user.save();
        emitAdminUserChanged("status-toggled", user);
        return apiResponse(res, 200, "User status toggled", user);
    } catch (error) {
        next(error);
    }
};


// ──────────────────────────────────────────────────────────────────
// GET /admin/patients — List patients with search + pagination
// ──────────────────────────────────────────────────────────────────

export const getAllPatients = async (req, res, next) => {
    try {
        const { search, page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const query = { role: "patient" };
        if (search) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(escaped, "i");
            query.$or = [
                { fullName: regex },
                { email: regex },
                { phone: regex },
            ];
        }

        const [users, total] = await Promise.all([
            User.find(query).select("-password").skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
            User.countDocuments(query),
        ]);

        const userIds = users.map(u => u._id);
        const patientProfiles = await Patient.find({ userId: { $in: userIds } });
        const profileMap = {};
        patientProfiles.forEach(p => { profileMap[p.userId.toString()] = p; });

        const patients = users.map(u => ({
            ...u.toObject(),
            patientProfile: profileMap[u._id.toString()] || null,
        }));

        return apiResponse(res, 200, "Patients retrieved", {
            patients,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
        });
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// GET /admin/patients/:id — Patient detail
// ──────────────────────────────────────────────────────────────────
export const getPatientDetail = async (req, res, next) => {
    try {
        const [user, patientProfile, recentAppointments] = await Promise.all([
            User.findById(req.params.id).select("-password"),
            Patient.findOne({ userId: req.params.id }),
            Appointment.find({ patientId: req.params.id })
                .populate({ path: "doctorId", populate: { path: "userId", select: "fullName" } })
                .populate("serviceId", "name")
                .sort({ appointmentDate: -1 })
                .limit(10),
        ]);

        if (!user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
        }

        return apiResponse(res, 200, "Patient detail retrieved", {
            user,
            patientProfile,
            recentAppointments,
        });
    } catch (error) {
        next(error);
    }
};
// ──────────────────────────────────────────────────────────────────
// PUT /admin/patients/:id — Update patient info
// ──────────────────────────────────────────────────────────────────
export const updatePatient = async (req, res, next) => {
    try {
        const { fullName, phone, email, dateOfBirth, gender, address } = req.body;

        // Update User fields
        const userUpdate = {};
        if (fullName) userUpdate.fullName = fullName;
        if (phone)    userUpdate.phone    = phone;
        if (email)    userUpdate.email    = email;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: userUpdate },
            { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy bệnh nhân" });
        }

        // Update Patient profile fields
        const profileUpdate = {};
        if (dateOfBirth !== undefined) profileUpdate.dateOfBirth = dateOfBirth;
        if (gender      !== undefined) profileUpdate.gender      = gender;
        if (address     !== undefined) profileUpdate.address     = address;

        let patientProfile = null;
        if (Object.keys(profileUpdate).length > 0) {
            patientProfile = await Patient.findOneAndUpdate(
                { userId: req.params.id },
                { $set: profileUpdate },
                { new: true, upsert: true }
            );
        } else {
            patientProfile = await Patient.findOne({ userId: req.params.id });
        }

        emitAdminUserChanged("patient-updated", user);
        return apiResponse(res, 200, "Cập nhật bệnh nhân thành công", {
            ...user.toObject(),
            patientProfile,
        });
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// DELETE /admin/patients/:id — Delete patient & related data
// ──────────────────────────────────────────────────────────────────
export const deletePatient = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy bệnh nhân" });
        }
        if (user.role !== "patient") {
            return res.status(403).json({ success: false, message: "Tài khoản này không phải bệnh nhân" });
        }

        // Xóa theo thứ tự: appointments → patient profile → user account
        await Appointment.deleteMany({ patientId: req.params.id });
        await Patient.deleteOne({ userId: req.params.id });
        await User.findByIdAndDelete(req.params.id);

        emitAdminUserChanged("patient-deleted", user);
        return apiResponse(res, 200, "Xóa bệnh nhân thành công", null);
    } catch (error) {
        next(error);
    }
};
