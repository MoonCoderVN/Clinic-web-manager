import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_EMBEDDING_MODEL = "embedding-001";

export const getEmbeddingConfig = () => ({
    provider: process.env.EMBEDDING_PROVIDER || "gemini",
    model: process.env.GEMINI_EMBEDDING_MODEL || process.env.EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL,
});

const getGeminiKey = () => process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_2 || "";

export const createEmbedding = async (text) => {
    const input = String(text || "").trim();
    if (!input) return [];

    const { provider, model } = getEmbeddingConfig();
    if (provider !== "gemini") {
        throw new Error(`Unsupported embedding provider: ${provider}`);
    }

    const key = getGeminiKey();
    if (!key) throw new Error("Missing GEMINI_API_KEY for embeddings");

    const genAI = new GoogleGenerativeAI(key);
    const embeddingModel = genAI.getGenerativeModel({ model });
    const result = await embeddingModel.embedContent(input.slice(0, 12000));
    const values = result?.embedding?.values;
    if (!Array.isArray(values) || values.length === 0) {
        throw new Error("Gemini embedding response is empty");
    }
    return values;
};

export const buildKnowledgeEmbeddingText = (item) => {
    const keywords = Array.isArray(item?.keywords) ? item.keywords.join(", ") : "";
    return [item?.title, item?.category, keywords, item?.content].filter(Boolean).join("\n");
};
