import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, "Please provide a full name"],
    },
    email: {
        type: String,
        required: [true, "Please provide an email"],
        unique: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            "Please provide a valid email",
        ],
    },
    password: {
        type: String,
        required: [true, "Please provide a password"],
        minlength: 6,
        select: false,
    },
    phone: {
        type: String,
        default: "",
    },
    role: {
        type: String,
        enum: ["patient", "doctor", "admin"],
        default: "patient",
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    avatar: String,
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    refreshToken: { type: String, select: false },
    deletedAt: { type: Date, select: false }, // Soft delete
}, { timestamps: true });

// Index cho query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Hash password before saving
userSchema.pre("save", async function(next) {
    if (!this.isModified("password")) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Match user-entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Soft delete method
userSchema.methods.softDelete = async function() {
    this.isActive = false;
    this.deletedAt = new Date();
    await this.save();
};

// Scope query to only active users by default
userSchema.statics.active = function() {
    return this.find({ isActive: true, deletedAt: null });
};

const User = mongoose.model("User", userSchema);

export default User;
