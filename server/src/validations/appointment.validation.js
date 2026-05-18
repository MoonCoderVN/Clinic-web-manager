import Joi from "joi";

export const createAppointmentSchema = Joi.object({
    doctorId: Joi.string().required().messages({
        "string.empty": "Vui lòng chọn bác sĩ"
    }),
    serviceId: Joi.string().required().messages({
        "string.empty": "Vui lòng chọn dịch vụ"
    }),
    appointmentDate: Joi.date().required().messages({
        "date.base": "Ngày khám không hợp lệ"
    }),
    startTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required().messages({
        "string.pattern.base": "Giờ khám phải có định dạng HH:MM"
    }),
    endTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required().messages({
        "string.pattern.base": "Giờ kết thúc phải có định dạng HH:MM"
    }),
    notes: Joi.string().max(500).optional().allow("")
});

export const rescheduleAppointmentSchema = Joi.object({
    appointmentDate: Joi.date().required(),
    startTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
    endTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
    notes: Joi.string().max(500).optional().allow("")
});

export const cancelAppointmentSchema = Joi.object({
    cancelReason: Joi.string().max(500).optional().allow("")
});

export const completeAppointmentSchema = Joi.object({
    diagnosis: Joi.string().max(1000).optional().allow(""),
    notes: Joi.string().max(500).optional().allow("")
});
