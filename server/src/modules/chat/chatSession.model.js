import mongoose from "mongoose";

const chatSessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    messages: [
        {
            role: {
                type: String,
                enum: ["user", "assistant"],
                required: true,
            },
            content: {
                type: String,
                required: true,
            },
            sentAt: {
                type: Date,
                default: Date.now,
            },
        },
    ],
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

const ChatSession = mongoose.model("ChatSession", chatSessionSchema);

export default ChatSession;
