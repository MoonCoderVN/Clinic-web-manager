import Knowledge from "../../modules/chat/knowledge.model.js";
import { buildKnowledgeEmbeddingText, createEmbedding, getEmbeddingConfig } from "./embeddingService.js";

const normalizeDoc = (doc, metadata = {}) => ({
    pageContent: `[${doc.title}]\n${doc.content}`,
    metadata: {
        title: doc.title,
        source: doc.source || "manual",
        category: doc.category,
        knowledgeId: String(doc._id),
        keywords: doc.keywords || [],
        ...metadata,
    },
});

const normalizeVietnamese = (value = "") =>
    String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase();

const escapeRegExp = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const tokenizeSearchText = (value = "") => {
    const rawWords = String(value || "")
        .toLowerCase()
        .replace(/[?!.,:;()[\]{}"']/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 1);
    const normalizedWords = normalizeVietnamese(value)
        .replace(/[?!.,:;()[\]{}"']/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 1);
    return [...new Set([...rawWords, ...normalizedWords])];
};

const getMinScore = () => {
    const value = Number(process.env.RAG_MIN_SCORE || 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
};

const applyMinScore = (docs = []) => {
    const minScore = getMinScore();
    if (minScore <= 0) return docs;
    return docs.filter((doc) => Number(doc.metadata?.score || 0) >= minScore);
};

export const upsertMongoKnowledgeVectors = async (items) => {
    const docs = Array.isArray(items) ? items : [items];
    const activeDocs = docs.filter((item) => item && item.isActive !== false);
    if (activeDocs.length === 0) return;

    const { provider, model } = getEmbeddingConfig();
    for (const item of activeDocs) {
        const embedding = await createEmbedding(buildKnowledgeEmbeddingText(item));
        await Knowledge.findByIdAndUpdate(item._id, {
            $set: {
                embedding,
                embeddingProvider: provider,
                embeddingModel: model,
                embeddedAt: new Date(),
            },
        });
    }
};

export const clearMongoKnowledgeVectorsByIds = async (ids = []) => {
    const cleanIds = ids.filter(Boolean);
    if (cleanIds.length === 0) return;
    await Knowledge.updateMany(
        { _id: { $in: cleanIds } },
        {
            $unset: { embedding: "", embeddedAt: "" },
            $set: { embeddingProvider: "", embeddingModel: "" },
        }
    );
};

const normalizeScore = (score, maxScore) => {
    if (!Number.isFinite(score) || score <= 0) return 0;
    if (!Number.isFinite(maxScore) || maxScore <= 0) return score;
    return score / maxScore;
};

const keywordSearch = async (query, topK, retrievalMode = "keyword") => {
    const words = tokenizeSearchText(query);
    if (words.length === 0) return [];

    const regex = new RegExp(words.map(escapeRegExp).join("|"), "i");
    const scanLimit = Number(process.env.RAG_KEYWORD_SCAN_LIMIT || 200);
    const directResults = await Knowledge.find({
        isActive: true,
        $or: [
            { title: { $regex: regex } },
            { content: { $regex: regex } },
            { keywords: { $in: words.map((w) => new RegExp(escapeRegExp(w), "i")) } },
        ],
    })
        .select("title content category keywords source")
        .limit(Math.max(topK * 4, 20))
        .lean();

    const needsNormalizedScan = directResults.length < topK;
    const scanResults = needsNormalizedScan
        ? await Knowledge.find({ isActive: true })
            .select("title content category keywords source")
            .sort({ updatedAt: -1 })
            .limit(Number.isFinite(scanLimit) && scanLimit > 0 ? scanLimit : 200)
            .lean()
        : [];

    const mergedResults = new Map();
    [...directResults, ...scanResults].forEach((doc) => {
        mergedResults.set(String(doc._id), doc);
    });

    const scored = [...mergedResults.values()].map((doc) => {
        const rawText = `${doc.title} ${doc.content} ${doc.keywords?.join(" ")}`.toLowerCase();
        const normalizedText = normalizeVietnamese(`${doc.title} ${doc.content} ${doc.keywords?.join(" ")}`);
        const score = words.reduce((acc, word) => {
            const safeWord = escapeRegExp(word);
            const rawMatches = (rawText.match(new RegExp(safeWord, "gi")) || []).length;
            const normalizedMatches = (normalizedText.match(new RegExp(safeWord, "gi")) || []).length;
            return acc + Math.max(rawMatches, normalizedMatches);
        }, 0);
        return { doc, score };
    }).filter((item) => item.score > 0);

    scored.sort((a, b) => b.score - a.score);
    const maxScore = scored[0]?.score || 1;
    return scored.slice(0, topK).map(({ doc, score }) =>
        normalizeDoc(doc, {
            keywordScore: normalizeScore(score, maxScore),
            score: normalizeScore(score, maxScore),
            retrievalMode,
        })
    );
};

const finalizeDocs = (docs = [], topK = 5) => applyMinScore(docs).slice(0, topK);

export const getMongoRetriever = (topK = 5) => ({
    invoke: async (query) => {
        if (!query || query.trim().length === 0) return [];

        const hybridEnabled = process.env.RAG_HYBRID_ENABLED !== "false";
        const vectorWeight = Number(process.env.RAG_VECTOR_WEIGHT || 0.7);
        const keywordWeight = Number(process.env.RAG_KEYWORD_WEIGHT || 0.3);

        try {
            const queryVector = await createEmbedding(query);
            const results = await Knowledge.aggregate([
                {
                    $vectorSearch: {
                        index: process.env.ATLAS_VECTOR_INDEX || "knowledge_vector_index",
                        path: process.env.ATLAS_VECTOR_PATH || "embedding",
                        queryVector,
                        numCandidates: Number(process.env.ATLAS_VECTOR_CANDIDATES || 100),
                        limit: hybridEnabled ? topK * 2 : topK,
                        filter: { isActive: true },
                    },
                },
                {
                    $project: {
                        title: 1,
                        content: 1,
                        category: 1,
                        keywords: 1,
                        source: 1,
                        score: { $meta: "vectorSearchScore" },
                    },
                },
            ]);
            const vectorDocs = results.map((doc) =>
                normalizeDoc(doc, {
                    vectorScore: Number(doc.score || 0),
                    score: Number(doc.score || 0),
                    retrievalMode: "vector",
                })
            );

            if (!hybridEnabled) {
                if (vectorDocs.length > 0) return finalizeDocs(vectorDocs, topK);
                return finalizeDocs(await keywordSearch(query, topK), topK);
            }

            const keywordDocs = await keywordSearch(query, topK * 2);
            const merged = new Map();

            vectorDocs.forEach((doc) => {
                const key = doc.metadata.knowledgeId || doc.pageContent.slice(0, 120);
                merged.set(key, {
                    doc,
                    vectorScore: Number(doc.metadata.vectorScore || 0),
                    keywordScore: 0,
                });
            });

            keywordDocs.forEach((doc) => {
                const key = doc.metadata.knowledgeId || doc.pageContent.slice(0, 120);
                const current = merged.get(key);
                if (current) {
                    current.keywordScore = Math.max(current.keywordScore, Number(doc.metadata.keywordScore || 0));
                    current.doc.metadata.retrievalMode = "hybrid";
                    current.doc.metadata.keywordScore = current.keywordScore;
                } else {
                    merged.set(key, {
                        doc,
                        vectorScore: 0,
                        keywordScore: Number(doc.metadata.keywordScore || 0),
                    });
                }
            });

            const ranked = [...merged.values()]
                .map((item) => ({
                    ...item,
                    score: item.vectorScore * vectorWeight + item.keywordScore * keywordWeight,
                }))
                .sort((a, b) => b.score - a.score)
                .map((item) => {
                    item.doc.metadata.hybridScore = item.score;
                    item.doc.metadata.score = item.score;
                    item.doc.metadata.retrievalMode = item.doc.metadata.retrievalMode || "hybrid";
                    return item.doc;
                });

            if (ranked.length > 0) return finalizeDocs(ranked, topK);
        } catch (err) {
            console.warn("[RAG] Atlas Vector Search fallback to keyword:", err.message);
            return finalizeDocs(await keywordSearch(query, topK, "keyword_fallback"), topK);
        }

        return finalizeDocs(await keywordSearch(query, topK), topK);
    },
});
