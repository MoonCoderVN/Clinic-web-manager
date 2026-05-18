import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: "clinic", unique: true },

    clinicName: { type: String, default: "DentaCare" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    openTime: { type: String, default: "08:00" },
    closeTime: { type: String, default: "17:00" },
    workDays: { type: String, default: "Thu 2 - Thu 7" },
    description: { type: String, default: "" },

    emailNotify: { type: Boolean, default: true },
    appointmentReminder: { type: Boolean, default: true },
    reminderHoursBefore: { type: Number, default: 24, min: 1, max: 168 },
    marketingEmails: { type: Boolean, default: false },

    smtpHost: { type: String, default: "" },
    smtpPort: { type: Number, default: 587 },
    smtpUser: { type: String, default: "" },
    smtpPass: { type: String, default: "", select: false },
    smtpFrom: { type: String, default: "" },

    geminiModel: { type: String, default: "" },
    geminiApiKey: { type: String, default: "", select: false },
    atlasVectorIndex: { type: String, default: "knowledge_vector_index" },
    atlasVectorPath: { type: String, default: "embedding" },
  },
  { timestamps: true }
);

const Settings = mongoose.model("Settings", settingsSchema);
export default Settings;
