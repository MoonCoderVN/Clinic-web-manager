import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    description: String,
    image: {
        type: String,
        default: "",
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    duration: {
        type: Number, // minutes
        required: true,
        min: 1,
    },
    category: {
        type: String,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    deletedAt: { type: Date, select: false },
}, { timestamps: true });

// Index
serviceSchema.index({ name: 1 });
serviceSchema.index({ category: 1 });
serviceSchema.index({ isActive: 1 });
serviceSchema.index({ isDeleted: 1 });
serviceSchema.index({ deletedAt: 1 });

const Service = mongoose.model("Service", serviceSchema);

export default Service;
