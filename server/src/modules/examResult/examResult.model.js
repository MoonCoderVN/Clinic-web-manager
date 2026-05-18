import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
    {
        fileName: { type: String, required: true },
        originalName: { type: String, default: "" },
        fileUrl: { type: String, required: true },
        mimeType: { type: String, default: "" },
        fileSize: { type: Number, default: 0 },
        type: {
            type: String,
            enum: ["xray", "image", "document"],
            default: "image",
        },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        uploadedAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const examResultSchema = new mongoose.Schema({
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Appointment",
        required: true,
        unique: true,
    },
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    diagnosis: {
        type: String,
        required: true,
    },
    treatment: String,
    treatmentPlan: String,
    prescription: String,
    note: String,
    notes: String,
    nextDate: Date,
    attachments: {
        type: [attachmentSchema],
        default: [],
    },
    reminderSent: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

examResultSchema.index({ nextDate: 1, reminderSent: 1 });
examResultSchema.index({ patientId: 1, createdAt: -1 });

const ExamResult = mongoose.model("ExamResult", examResultSchema);

export default ExamResult;
