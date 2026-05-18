import express from "express";
import {
    getStats,
    getReports,
    getAllUsers,
    toggleUserStatus,
    getAllPatients,
    getPatientDetail,
    updatePatient,
    deletePatient,
    createPatient,
    createDoctor,
    exportReportsPdf,
} from "./admin.controller.js";
import { getSettings, getSystemLogs, updateSettings } from "./settings.controller.js";
import { protect } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/roleMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize("admin"));

router.get("/stats", getStats);
router.get("/reports", getReports);
router.get("/reports/export.pdf", exportReportsPdf);
router.get("/users", getAllUsers);
router.patch("/users/:id/toggle", toggleUserStatus);
router.post("/create-doctor", createDoctor);
router.get("/patients", getAllPatients);
router.post("/patients", createPatient);
router.get("/patients/:id", getPatientDetail);
router.put("/patients/:id", updatePatient);
router.delete("/patients/:id", deletePatient);
router.get("/settings", getSettings);
router.put("/settings", updateSettings);
router.get("/system-logs", getSystemLogs);

export default router;

