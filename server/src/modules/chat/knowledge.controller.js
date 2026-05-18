import Knowledge from "./knowledge.model.js";
import apiResponse from "../../utils/apiResponse.js";
import { retrieveRagContext } from "../../rag/chain/ragChain.js";
import {
    clearMongoKnowledgeVectorsByIds,
    upsertMongoKnowledgeVectors,
} from "../../rag/retriever/mongoRetriever.js";

const normalizeKnowledgeItem = (item) => ({
    _id: item._id,
    title: typeof item.title === "string" ? item.title : "",
    content: typeof item.content === "string" ? item.content : "",
    category: typeof item.category === "string" ? item.category : "general",
    keywords: Array.isArray(item.keywords)
        ? item.keywords.filter((keyword) => typeof keyword === "string")
        : [],
    source: typeof item.source === "string" ? item.source : "manual",
    isActive: item.isActive !== false,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
});

// GET /knowledge - List all knowledge entries (admin)
export const getKnowledge = async (req, res, next) => {
    try {
        const { category, source } = req.query;
        const filter = {};
        if (category && category !== "all") filter.category = category;
        if (source === "manual") filter.source = { $in: ["manual", "", null] };
        if (source === "file") filter.source = /^file:/;
        if (source === "sheet") filter.source = /^sheet:/;

        const items = await Knowledge.find(filter).sort({ createdAt: -1 }).lean();
        return apiResponse(res, 200, "Knowledge retrieved", items.map(normalizeKnowledgeItem));
    } catch (error) {
        next(error);
    }
};

// POST /knowledge - Create new knowledge entry
export const createKnowledge = async (req, res, next) => {
    try {
        const { title, content, category, keywords } = req.body;
        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: "Tiêu đề và nội dung không được để trống",
            });
        }

        const item = await Knowledge.create({
            title,
            content,
            category: category || "general",
            keywords: Array.isArray(keywords) ? keywords : [],
        });

        await upsertMongoKnowledgeVectors(item);
        return apiResponse(res, 201, "Đã thêm mục kiến thức", item);
    } catch (error) {
        next(error);
    }
};

// PUT /knowledge/:id - Update knowledge entry
export const updateKnowledge = async (req, res, next) => {
    try {
        const item = await Knowledge.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!item) {
            return res.status(404).json({ success: false, message: "Không tìm thấy mục kiến thức" });
        }

        if (item.isActive === false) {
            await clearMongoKnowledgeVectorsByIds([item._id]);
        } else {
            await upsertMongoKnowledgeVectors(item);
        }

        return apiResponse(res, 200, "Đã cập nhật mục kiến thức", item);
    } catch (error) {
        next(error);
    }
};

// DELETE /knowledge/:id - Delete knowledge entry
export const deleteKnowledge = async (req, res, next) => {
    try {
        const item = await Knowledge.findByIdAndDelete(req.params.id);
        if (!item) {
            return res.status(404).json({ success: false, message: "Không tìm thấy mục kiến thức" });
        }

        await clearMongoKnowledgeVectorsByIds([item._id]);
        return apiResponse(res, 200, "Đã xóa mục kiến thức");
    } catch (error) {
        next(error);
    }
};

// POST /knowledge/test-query - preview retrieved contexts without calling LLM
export const testKnowledgeQuery = async (req, res, next) => {
    try {
        const query = String(req.body?.query || "").trim();
        if (!query) {
            return res.status(400).json({ success: false, message: "Vui lòng nhập câu hỏi để kiểm thử" });
        }

        const result = await retrieveRagContext(query);
        return apiResponse(res, 200, "RAG context retrieved", {
            contextCount: result.contextCount || result.contexts?.length || 0,
            sources: result.sources || [],
            contexts: (result.contexts || []).map((context) => ({
                ...context,
                score: Number(context.metadata?.score || 0),
                retrievalMode: context.metadata?.retrievalMode || "unknown",
            })),
        });
    } catch (error) {
        next(error);
    }
};
