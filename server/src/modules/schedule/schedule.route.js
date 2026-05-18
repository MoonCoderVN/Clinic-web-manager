import express from "express";
import { getSchedules, getAllSchedules, getAvailability, createSchedule, bulkCreateSchedules, updateSchedule, deleteSchedule } from "./schedule.controller.js";
import { protect } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/roleMiddleware.js";

const router = express.Router();

// GET — bác sĩ và bệnh nhân đều xem được lịch
router.get("/doctor/:doctorId", getSchedules);
router.get("/availability", getAvailability);

// POST / PUT / DELETE — chỉ admin
router.use(protect);
router.use(authorize("admin"));
router.get("/all", getAllSchedules);
router.post("/", createSchedule);
router.post("/bulk", bulkCreateSchedules);
router.put("/:id", updateSchedule);
router.delete("/:id", deleteSchedule);

export default router;
