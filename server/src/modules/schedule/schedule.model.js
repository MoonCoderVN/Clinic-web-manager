import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema({
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    dayOfWeek: {
        type: Number, // 0-6 (Sunday-Saturday)
        required: true,
    },
    startTime: {
        type: String, // e.g., "08:00"
        required: function requiredStartTime() {
            return !this.isOff;
        },
    },
    endTime: {
        type: String, // e.g., "17:00"
        required: function requiredEndTime() {
            return !this.isOff;
        },
    },
    maxSlots: {
        type: Number,
        default: 10,
    },
    weekStart: {
        type: String, // format "YYYY-MM-DD" representing the Monday of that week. Null = default recurring.
        default: null,
    },
    isOff: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

const Schedule = mongoose.model("Schedule", scheduleSchema);

export default Schedule;
