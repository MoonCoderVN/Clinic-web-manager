import mongoose from "mongoose";

const knowledgeDocumentSchema = new mongoose.Schema({
    sourceType: {
        type: String,
        enum: ["file", "google_sheet"],
        default: "file",
    },
    fileName: {
        type: String,
        required: true,
    },
    fileUrl: {
        type: String,
        default: "",
    },
    sourceUrl: {
        type: String,
        default: "",
    },
    status: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending",
    },
    chunksCreated: {
        type: Number,
        default: 0,
    },
    errorMessage: {
        type: String,
        default: "",
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, { timestamps: true });

const KnowledgeDocument = mongoose.model("KnowledgeDocument", knowledgeDocumentSchema);

export default KnowledgeDocument;
