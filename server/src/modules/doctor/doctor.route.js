import express from "express";
import {
    getDoctors,
    getDoctorById,
    getTodayAppointments,
    getDoctorProfile,
    updateDoctorProfile,
    getDoctorWeekSchedule,
    getAggregatedSlots,
    getAvailableSlots,
    adminCreateDoctor,
    adminUpdateDoctor,
    adminDeleteDoctor,
} from "./doctor.controller.js";
import { protect, optionalProtect } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/roleMiddleware.js";

const router = express.Router();

// Public routes (no auth needed)
router.get("/", optionalProtect, getDoctors);
router.get("/aggregated-slots", getAggregatedSlots);
router.get("/:id", getDoctorById);

// Protected routes — must come BEFORE /:id to avoid route collision
router.use(protect);

// Doctor self-management — specific paths before param routes
router.get("/profile/me", authorize("doctor"), getDoctorProfile);
router.put("/profile/me", authorize("doctor"), updateDoctorProfile);
router.get("/today/appointments", authorize("doctor"), getTodayAppointments);
router.get("/me/schedule", authorize("doctor"), getDoctorWeekSchedule);

// Admin-only CRUD (POST creates a new doctor)
router.post("/", authorize("admin"), adminCreateDoctor);

// Available slots — public-ish but requires auth for booking flow
router.get("/:id/available-slots", getAvailableSlots);

// Admin update/delete by ID
router.put("/:id", authorize("admin", "doctor"), adminUpdateDoctor);
router.delete("/:id", authorize("admin"), adminDeleteDoctor);

export default router;
