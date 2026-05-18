import mongoose from "mongoose";

const patientSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
    },
    dateOfBirth: Date,
    gender: {
        type: String,
        enum: ["male", "female", "other"],
    },
    address: String,
    medicalHistory: [String],
    allergies: [String],
    insuranceInfo: {
        provider: String,
        policyNumber: String,
        expiryDate: Date,
    },
    emergencyContact: {
        name: String,
        phone: String,
        relationship: String,
    },
    deletedAt: { type: Date, select: false },
}, { timestamps: true });

// Index
patientSchema.index({ userId: 1 });
patientSchema.index({ deletedAt: 1 });

const Patient = mongoose.model("Patient", patientSchema);

export default Patient;
