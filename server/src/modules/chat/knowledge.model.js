import mongoose from "mongoose";

const knowledgeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    source: {
        type: String,
        default: "manual",
    },
    keywords: [String],
    isActive: {
        type: Boolean,
        default: true,
    },
    deletedAt: { type: Date, select: false },
    // Vector search fields
    embedding: {
        type: [Number],
        select: false,
    },
    embeddingProvider: {
        type: String,
        select: false,
    },
    embeddingModel: {
        type: String,
        select: false,
    },
    embeddedAt: {
        type: Date,
        select: false,
    },
}, { timestamps: true });

// Index
knowledgeSchema.index({ title: 1 });
knowledgeSchema.index({ category: 1 });
knowledgeSchema.index({ isActive: 1 });
knowledgeSchema.index({ deletedAt: 1 });

const Knowledge = mongoose.model("Knowledge", knowledgeSchema);

export default Knowledge;
