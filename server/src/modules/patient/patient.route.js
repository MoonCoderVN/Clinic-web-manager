import express from "express";
import { getPatientProfile, getPatientProfileForDoctor, updatePatientProfile, getAppointmentHistory, getMyExamResults } from "./patient.controller.js";
import { protect } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/roleMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/profile/by-doctor", authorize("doctor", "admin"), getPatientProfileForDoctor);

router.use(authorize("patient", "admin"));

router.get("/profile", getPatientProfile);
router.put("/profile", updatePatientProfile);
router.get("/history", getAppointmentHistory);
router.get("/me/exam-results", getMyExamResults);

export default router;
