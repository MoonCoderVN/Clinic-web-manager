import express from "express";
import {
    createAppointment,
    getMyAppointments,
    getAppointmentById,
    cancelAppointment,
    completeAppointment,
    confirmAppointment,
    checkInAppointment,
    rescheduleAppointment,
    getAllAppointments,
} from "./appointment.controller.js";
import { protect } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/roleMiddleware.js";
import { validate, validateParams } from "../../middlewares/validation.js";
import { 
    createAppointmentSchema, 
    rescheduleAppointmentSchema, 
    cancelAppointmentSchema,
    completeAppointmentSchema 
} from "../../validations/appointment.validation.js";
import Joi from "joi";

const router = express.Router();

router.use(protect);

// Patient routes
router.post("/", authorize("patient"), validate(createAppointmentSchema), createAppointment);
router.get("/", getMyAppointments);
router.get("/my", getMyAppointments);
router.get("/all", authorize("admin", "doctor"), getAllAppointments);
router.get("/:id", validateParams(Joi.object({ id: Joi.string().required() })), getAppointmentById);

// Reschedule & cancel
router.put("/:id/reschedule", validateParams(Joi.object({ id: Joi.string().required() })), validate(rescheduleAppointmentSchema), rescheduleAppointment);
router.delete("/:id", validateParams(Joi.object({ id: Joi.string().required() })), validate(cancelAppointmentSchema), cancelAppointment);
router.patch("/:id/cancel", validateParams(Joi.object({ id: Joi.string().required() })), validate(cancelAppointmentSchema), cancelAppointment);

// Doctor/admin actions
router.patch("/:id/confirm", validateParams(Joi.object({ id: Joi.string().required() })), authorize("doctor", "admin"), confirmAppointment);
router.patch("/:id/checkin", validateParams(Joi.object({ id: Joi.string().required() })), authorize("doctor", "admin"), checkInAppointment);
router.patch("/:id/complete", validateParams(Joi.object({ id: Joi.string().required() })), authorize("doctor", "admin"), validate(completeAppointmentSchema), completeAppointment);

export default router;
