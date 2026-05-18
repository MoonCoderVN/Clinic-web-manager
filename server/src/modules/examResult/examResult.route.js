import express from "express";
import { createExamResult, deleteExamAttachment, deleteExamResult, getByAppointment, updateExamResult, getByPatient, uploadExamAttachment } from "./examResult.controller.js";
import { protect } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/roleMiddleware.js";
import { dentalRecordUpload } from "../../middlewares/uploadMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", authorize("doctor"), createExamResult);
router.get("/by-patient", authorize("patient", "doctor", "admin"), getByPatient);
router.get("/appointment/:appointmentId", authorize("patient", "doctor", "admin"), getByAppointment);
router.put("/:id", authorize("doctor", "admin"), updateExamResult);
router.post("/:id/attachments", authorize("doctor", "admin"), dentalRecordUpload.single("file"), uploadExamAttachment);
router.delete("/:id/attachments/:attachmentId", authorize("doctor", "admin"), deleteExamAttachment);
router.delete("/:id", authorize("doctor", "admin"), deleteExamResult);

export default router;
