import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor",
        required: true,
    },
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: true,
    },
    // Primary date/time fields (new format)
    appointmentDate: {
        type: Date,
        required: true,
    },
    startTime: {
        type: String, // "HH:MM"
        required: true,
    },
    endTime: {
        type: String, // "HH:MM"
        required: true,
    },
    status: {
        type: String,
        enum: ["pending", "confirmed", "rescheduled", "in_progress", "completed", "cancelled"],
        default: "pending",
    },
    notes: String,
    diagnosis: String,
    cancelReason: String,
    cancelledBy: {
        type: String,
        enum: ["patient", "doctor", "admin", "system"],
    },
    cancelledAt: Date,
    checkedInAt: Date,
    completedAt: Date,

    // Đã gửi email nhắc trước 1 tiếng chưa
    hourReminderSent: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

// Index cho query performance
appointmentSchema.index({ patientId: 1, appointmentDate: -1 });
appointmentSchema.index({ doctorId: 1, appointmentDate: -1 });
appointmentSchema.index({ status: 1, appointmentDate: 1 });
appointmentSchema.index({ appointmentDate: 1 });

// Virtual để unify date fields (backward compatibility)
appointmentSchema.virtual("effectiveDate").get(function () {
    return this.appointmentDate;
});

appointmentSchema.virtual("effectiveTime").get(function () {
    return this.startTime;
});

const Appointment = mongoose.model("Appointment", appointmentSchema);

export default Appointment;
