import Joi from "joi";

export const createAppointmentSchema = Joi.object({
    doctorId: Joi.string().required().messages({
        "string.empty": "Vui lòng chọn bác sĩ",
        "any.required": "Vui lòng chọn bác sĩ",
    }),
    serviceId: Joi.string().required().messages({
        "string.empty": "Vui lòng chọn dịch vụ",
        "any.required": "Vui lòng chọn dịch vụ",
    }),
    appointmentDate: Joi.date().required().messages({
        "date.base": "Ngày khám không hợp lệ",
        "any.required": "Vui lòng chọn ngày khám",
    }),
    startTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required().messages({
        "string.pattern.base": "Giờ khám phải có định dạng HH:MM",
        "string.empty": "Vui lòng chọn giờ khám",
        "any.required": "Vui lòng chọn giờ khám",
    }),
    endTime: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
    note: Joi.string().max(500).optional().allow(""),
    notes: Joi.string().max(500).optional().allow(""),
});

export const rescheduleAppointmentSchema = Joi.object({
    newDate: Joi.date().required().messages({
        "date.base": "Ngày mới không hợp lệ",
        "any.required": "Vui lòng chọn ngày mới",
    }),
    newTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required().messages({
        "string.pattern.base": "Giờ mới phải có định dạng HH:MM",
        "string.empty": "Vui lòng chọn giờ mới",
        "any.required": "Vui lòng chọn giờ mới",
    }),
    notes: Joi.string().max(500).optional().allow(""),
});

export const cancelAppointmentSchema = Joi.object({
    cancelReason: Joi.string().max(500).optional().allow(""),
    reason: Joi.string().max(500).optional().allow(""),
});

export const completeAppointmentSchema = Joi.object({
    diagnosis: Joi.string().max(1000).optional().allow(""),
    notes: Joi.string().max(500).optional().allow(""),
});
