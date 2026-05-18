import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
    },
    specialization: {
        type: String,
        required: true,
    },
    experience: {
        type: Number,
        default: 0,
    },
    licenseNumber: {
        type: String,
        required: true,
        unique: true,
    },
    education: [String],
    certifications: [String],
    services: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
    }],
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
    },
    deletedAt: { type: Date, select: false },
}, { timestamps: true });

// Index
doctorSchema.index({ userId: 1 });
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ deletedAt: 1 });

const Doctor = mongoose.model("Doctor", doctorSchema);

export default Doctor;
