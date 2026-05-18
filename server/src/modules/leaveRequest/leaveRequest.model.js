import mongoose from "mongoose";

const leaveRequestSchema = new mongoose.Schema({
    doctor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    reason: {
        type: String,
        required: true,
        trim: true,
    },
    date_off: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected", "cancelled"],
        default: "pending",
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    reviewedAt: {
        type: Date,
        default: null,
    },
    reviewNote: {
        type: String,
        default: "",
        trim: true,
    },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

leaveRequestSchema.index({ doctor_id: 1, date_off: 1, status: 1 });
leaveRequestSchema.index({ status: 1, createdAt: -1 });

leaveRequestSchema.virtual("doctorId").get(function getDoctorId() {
    return this.doctor_id;
});

leaveRequestSchema.virtual("date").get(function getDateAlias() {
    if (!this.date_off) return null;
    const d = new Date(this.date_off);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
});

leaveRequestSchema.virtual("weekStart").get(function getWeekStartAlias() {
    if (!this.date_off) return null;
    const d = new Date(this.date_off);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
});

leaveRequestSchema.virtual("dayOfWeek").get(function getDayOfWeekAlias() {
    if (!this.date_off) return null;
    return new Date(this.date_off).getDay();
});

const LeaveRequest = mongoose.model("LeaveRequest", leaveRequestSchema);

export default LeaveRequest;
