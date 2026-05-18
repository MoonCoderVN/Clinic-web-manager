import fs from "fs";
import path from "path";
import { createRequire } from "module";
import KnowledgeDocument from "./knowledgeDocument.model.js";
import Knowledge from "./knowledge.model.js";
import apiResponse from "../../utils/apiResponse.js";
import {
    clearMongoKnowledgeVectorsByIds,
    upsertMongoKnowledgeVectors,
} from "../../rag/retriever/mongoRetriever.js";

// Dùng createRequire để tránh lỗi ESM với pdf-parse, mammoth, xlsx
const require = createRequire(import.meta.url);
const SHEET_CATEGORIES = new Set(["general", "services", "procedures", "aftercare", "faq", "pricing"]);
const GOOGLE_SHEET_HOST = "docs.google.com";

const normalizeUploadedBy = (uploadedBy) => {
    if (!uploadedBy || typeof uploadedBy !== "object") return null;
    return {
        _id: uploadedBy._id,
        fullName: typeof uploadedBy.fullName === "string" ? uploadedBy.fullName : "",
        email: typeof uploadedBy.email === "string" ? uploadedBy.email : "",
    };
};

const normalizeKnowledgeDocument = (doc) => ({
    _id: doc._id,
    sourceType: typeof doc.sourceType === "string" ? doc.sourceType : "file",
    fileName: typeof doc.fileName === "string" ? doc.fileName : "",
    fileUrl: typeof doc.fileUrl === "string" ? doc.fileUrl : "",
    sourceUrl: typeof doc.sourceUrl === "string" ? doc.sourceUrl : "",
    uploadedBy: normalizeUploadedBy(doc.uploadedBy),
    status: typeof doc.status === "string" ? doc.status : "pending",
    chunksCreated: Number.isFinite(doc.chunksCreated) ? doc.chunksCreated : 0,
    errorMessage: typeof doc.errorMessage === "string" ? doc.errorMessage : "",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
});

// ── Text extractors ──────────────────────────────────────────────────
const parsePdf = async (filePath) => {
    const pdfParse = require("pdf-parse");
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text || "";
};

const parseDocx = async (filePath) => {
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || "";
};

const parseExcel = (filePath) => {
    const XLSX = require("xlsx");
    const workbook = XLSX.readFile(filePath);
    let text = "";
    workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        text += `\n[Sheet: ${sheetName}]\n${csv}`;
    });
    return text;
};

const parseTxt = (filePath) => {
    return fs.readFileSync(filePath, "utf-8");
};

const isCsvSheetUrl = (parsed) => {
    const output = parsed.searchParams.get("output");
    const format = parsed.searchParams.get("format");
    const tqx = parsed.searchParams.get("tqx") || "";
    return output === "csv" || format === "csv" || tqx.includes("out:csv");
};

const pushUnique = (items, value) => {
    if (value && !items.includes(value)) items.push(value);
};

const getSheetCsvUrls = (url) => {
    const rawUrl = String(url || "").trim();
    if (!rawUrl) return [];

    let parsed;
    try {
        parsed = new URL(rawUrl);
    } catch {
        return [];
    }

    if (parsed.hostname !== GOOGLE_SHEET_HOST) return [];
    if (!parsed.pathname.includes("/spreadsheets/")) return [];

    const csvUrls = [];
    const gid = parsed.searchParams.get("gid");

    if (isCsvSheetUrl(parsed)) {
        pushUnique(csvUrls, rawUrl);
    }

    const publishedMatch = parsed.pathname.match(/\/spreadsheets\/d\/e\/([^/]+)\/(?:pub|pubhtml)/);
    if (publishedMatch?.[1]) {
        const pubUrl = new URL(`https://docs.google.com/spreadsheets/d/e/${publishedMatch[1]}/pub`);
        pubUrl.searchParams.set("output", "csv");
        if (gid) pubUrl.searchParams.set("gid", gid);
        pushUnique(csvUrls, pubUrl.toString());
        return csvUrls;
    }

    const idMatch = parsed.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
    if (!idMatch?.[1]) return csvUrls;

    const exportUrl = new URL(`https://docs.google.com/spreadsheets/d/${idMatch[1]}/export`);
    exportUrl.searchParams.set("format", "csv");
    if (gid) exportUrl.searchParams.set("gid", gid);
    pushUnique(csvUrls, exportUrl.toString());

    const gvizUrl = new URL(`https://docs.google.com/spreadsheets/d/${idMatch[1]}/gviz/tq`);
    gvizUrl.searchParams.set("tqx", "out:csv");
    if (gid) gvizUrl.searchParams.set("gid", gid);
    pushUnique(csvUrls, gvizUrl.toString());

    return csvUrls;
};

const readPublicSheetCsv = async (csvUrls) => {
    const urls = Array.isArray(csvUrls) ? csvUrls : [csvUrls].filter(Boolean);
    const failures = [];

    for (const csvUrl of urls) {
        try {
            const response = await fetch(csvUrl, {
                redirect: "follow",
                headers: { "Accept": "text/csv,text/plain,*/*" },
            });

            const contentType = response.headers.get("content-type") || "";
            const text = await response.text();
            const looksLikeHtml = /^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text);
            const looksLikeCsv = /text\/csv|text\/plain|application\/octet-stream/i.test(contentType) || text.includes(",");

            if (response.ok && !looksLikeHtml && looksLikeCsv) {
                return text;
            }

            failures.push({
                status: response.status,
                type: contentType || "unknown",
                reason: looksLikeHtml ? "html/login" : response.ok ? "not-csv" : "http-error",
            });
        } catch (error) {
            failures.push({ status: "network", type: "unknown", reason: error.message });
        }
    }

    const statusList = failures.map((failure) => `${failure.status}:${failure.reason}`).join(", ") || "no-candidate";
    const hasAuthFailure = failures.some((failure) => failure.status === 401 || failure.status === 403);
    const hasHtmlResponse = failures.some((failure) => failure.reason === "html/login");

    if (hasAuthFailure) {
        throw new Error(`Google Sheet chua public hoac chua publish CSV. Da thu export/gviz nhung Google tra ${statusList}.`);
    }
    if (hasHtmlResponse) {
        throw new Error(`Google Sheet tra ve trang HTML/login thay vi CSV. Hay bat share public hoac publish CSV roi thu lai. Chi tiet: ${statusList}.`);
    }
    throw new Error(`Khong the tai Google Sheet dang CSV. Da thu ${urls.length} cach, ket qua: ${statusList}.`);
};

const parseSheetRows = (csvText, fallbackCategory) => {
    const XLSX = require("xlsx");
    const workbook = XLSX.read(csvText, { type: "string" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
    return rows
        .map((row) => {
            const normalized = Object.entries(row).reduce((acc, [key, value]) => {
                acc[String(key).trim().toLowerCase()] = typeof value === "string" ? value.trim() : String(value || "").trim();
                return acc;
            }, {});
            const rawCategory = normalized.category.toLowerCase();
            const category = SHEET_CATEGORIES.has(rawCategory) ? rawCategory : fallbackCategory;
            return {
                title: normalized.title,
                content: normalized.content,
                category,
                keywords: normalized.keywords
                    ? normalized.keywords.split(",").map((keyword) => keyword.trim()).filter(Boolean)
                    : [],
            };
        })
        .filter((row) => row.title && row.content);
};

// Chunk text into ~800-char pieces with overlap, preferring natural separators.
const chunkText = (text, chunkSize = 800, overlap = 120) => {
    const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    const chunks = [];
    let start = 0;
    while (start < cleaned.length) {
        let end = Math.min(start + chunkSize, cleaned.length);
        if (end < cleaned.length) {
            const window = cleaned.slice(start, end);
            const separators = ["\n\n", "\n", ". ", "; ", ", ", " "];
            const splitAt = separators
                .map((separator) => window.lastIndexOf(separator))
                .filter((index) => index >= Math.floor(chunkSize * 0.55))
                .sort((a, b) => b - a)[0];
            if (Number.isFinite(splitAt)) end = start + splitAt + 1;
        }
        chunks.push(cleaned.slice(start, end));
        if (end === cleaned.length) break;
        start = Math.max(0, end - overlap);
    }
    return chunks.filter((c) => c.trim().length > 30);
};

// ──────────────────────────────────────────────────────────────────
// POST /knowledge/documents/upload
// ──────────────────────────────────────────────────────────────────
export const uploadDocument = async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "Vui lòng chọn file để upload" });
    }

    const { originalname, path: filePath } = req.file;
    const { category = "general" } = req.body;

    let docRecord;
    try {
        docRecord = await KnowledgeDocument.create({
            fileName: originalname,
            fileUrl: filePath,
            uploadedBy: req.user.id,
            status: "processing",
        });
    } catch (err) {
        return next(err);
    }

    // Trả về ngay, xử lý file bất đồng bộ
    res.status(202).json({
        success: true,
        message: "File đã được nhận. Đang xử lý vào knowledge base...",
        data: { documentId: docRecord._id, fileName: originalname, status: "processing" },
    });

    // Xử lý nền
    processFileAsync(docRecord, filePath, originalname, category);
};

export const createSheetSource = async (req, res, next) => {
    const { url, category = "general" } = req.body || {};
    const sourceUrl = String(url || "").trim();
    const csvUrls = getSheetCsvUrls(sourceUrl);

    if (csvUrls.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Vui long nhap link Google Sheet public hoac link publish CSV hop le",
        });
    }

    let docRecord;
    try {
        docRecord = await KnowledgeDocument.create({
            sourceType: "google_sheet",
            fileName: "Google Sheet - Du lieu kien thuc",
            fileUrl: "",
            sourceUrl,
            uploadedBy: req.user.id,
            status: "processing",
        });
    } catch (err) {
        return next(err);
    }

    res.status(202).json({
        success: true,
        message: "Google Sheet da duoc them. Dang dong bo vao knowledge base...",
        data: { documentId: docRecord._id, fileName: docRecord.fileName, status: "processing" },
    });

    processSheetAsync(docRecord, csvUrls, category);
};

async function processFileAsync(docRecord, filePath, fileName, category, { replaceExisting = false } = {}) {
    const ext = path.extname(fileName).toLowerCase();
    try {
        let rawText = "";

        console.log(`📄 Processing file: "${fileName}" (ext: ${ext})`);

        if (ext === ".pdf") {
            rawText = await parsePdf(filePath);
        } else if (ext === ".docx" || ext === ".doc") {
            rawText = await parseDocx(filePath);
        } else if ([".xlsx", ".xls", ".csv"].includes(ext)) {
            rawText = parseExcel(filePath);
        } else if (ext === ".txt") {
            rawText = parseTxt(filePath);
        } else {
            throw new Error(`Định dạng file không được hỗ trợ: ${ext}`);
        }

        if (!rawText || rawText.trim().length < 30) {
            throw new Error("File rỗng hoặc không trích xuất được nội dung");
        }

        const chunks = chunkText(rawText);
        if (chunks.length === 0) {
            throw new Error("Không tạo được đoạn nội dung nào từ file");
        }

        const source = `file:${fileName}`;
        if (replaceExisting) {
            const oldChunks = await Knowledge.find({ source }).select("_id").lean();
            await clearMongoKnowledgeVectorsByIds(oldChunks.map((chunk) => chunk._id));
            await Knowledge.deleteMany({ source });
        }

        const baseName = path.basename(fileName, ext);
        const knowledgeDocs = chunks.map((chunk, i) => ({
            title: `[${baseName}] Phần ${i + 1}/${chunks.length}`,
            content: chunk,
            category,
            keywords: [baseName],
            source,
            isActive: true,
        }));

        const insertedDocs = await Knowledge.insertMany(knowledgeDocs);
        await upsertMongoKnowledgeVectors(insertedDocs);

        docRecord.status = "completed";
        docRecord.chunksCreated = chunks.length;
        await docRecord.save();

        console.log(`✅ Xong "${fileName}": ${chunks.length} đoạn đã thêm vào Knowledge base`);
    } catch (err) {
        console.error(`❌ Lỗi xử lý "${fileName}":`, err.message);
        docRecord.status = "failed";
        docRecord.errorMessage = err.message;
        await docRecord.save();
    }
}

async function processSheetAsync(docRecord, csvUrls, fallbackCategory, { replaceExisting = true } = {}) {
    try {
        console.log(`Processing Google Sheet source: "${docRecord.sourceUrl}"`);

        const csvText = await readPublicSheetCsv(csvUrls);
        const rows = parseSheetRows(csvText, SHEET_CATEGORIES.has(fallbackCategory) ? fallbackCategory : "general");
        if (rows.length === 0) {
            throw new Error("Google Sheet khong co dong hop le. Can cot title va content.");
        }

        const source = `sheet:${docRecord._id}`;
        if (replaceExisting) {
            const oldRows = await Knowledge.find({ source }).select("_id").lean();
            await clearMongoKnowledgeVectorsByIds(oldRows.map((row) => row._id));
            await Knowledge.deleteMany({ source });
        }

        const knowledgeDocs = rows.map((row) => ({
            title: row.title,
            content: row.content,
            category: row.category,
            keywords: row.keywords,
            source,
            isActive: true,
        }));

        const insertedDocs = await Knowledge.insertMany(knowledgeDocs);
        await upsertMongoKnowledgeVectors(insertedDocs);

        docRecord.status = "completed";
        docRecord.chunksCreated = insertedDocs.length;
        docRecord.errorMessage = "";
        await docRecord.save();

        console.log(`Done Google Sheet "${docRecord.sourceUrl}": ${insertedDocs.length} rows indexed`);
    } catch (err) {
        console.error(`Google Sheet sync failed "${docRecord.sourceUrl}":`, err.message);
        docRecord.status = "failed";
        docRecord.errorMessage = err.message;
        await docRecord.save();
    }
}

// ──────────────────────────────────────────────────────────────────
// GET /knowledge/documents
// ──────────────────────────────────────────────────────────────────
export const getDocuments = async (req, res, next) => {
    try {
        const docs = await KnowledgeDocument.find()
            .populate("uploadedBy", "fullName email")
            .sort({ createdAt: -1 })
            .lean();
        return apiResponse(res, 200, "Documents retrieved", docs.map(normalizeKnowledgeDocument));
    } catch (error) {
        next(error);
    }
};

export const reindexDocument = async (req, res, next) => {
    try {
        const doc = await KnowledgeDocument.findById(req.params.id);
        if (!doc) {
            return res.status(404).json({ success: false, message: "Khong tim thay tai lieu" });
        }

        if (doc.sourceType === "google_sheet") {
            const csvUrls = getSheetCsvUrls(doc.sourceUrl);
            if (csvUrls.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Link Google Sheet khong hop le, khong the re-index.",
                });
            }

            const source = `sheet:${doc._id}`;
            const existingRow = await Knowledge.findOne({ source }).select("category").lean();
            const category = req.body?.category || existingRow?.category || "general";

            doc.status = "processing";
            doc.errorMessage = "";
            await doc.save();

            res.status(202).json({
                success: true,
                message: "Google Sheet dang duoc dong bo lai",
                data: { documentId: doc._id, fileName: doc.fileName, status: doc.status },
            });

            processSheetAsync(doc, csvUrls, category, { replaceExisting: true });
            return;
        }

        if (!doc.fileUrl || !fs.existsSync(doc.fileUrl)) {
            return res.status(400).json({
                success: false,
                message: "File goc khong con ton tai, khong the re-index. Vui long upload lai tai lieu.",
            });
        }

        const source = `file:${doc.fileName}`;
        const existingChunk = await Knowledge.findOne({ source }).select("category").lean();
        const category = req.body?.category || existingChunk?.category || "general";

        doc.status = "processing";
        doc.errorMessage = "";
        await doc.save();

        res.status(202).json({
            success: true,
            message: "Tai lieu dang duoc re-index",
            data: { documentId: doc._id, fileName: doc.fileName, status: doc.status },
        });

        processFileAsync(doc, doc.fileUrl, doc.fileName, category, { replaceExisting: true });
    } catch (error) {
        next(error);
    }
};

// ──────────────────────────────────────────────────────────────────
// DELETE /knowledge/documents/:id
// ──────────────────────────────────────────────────────────────────
export const deleteDocument = async (req, res, next) => {
    try {
        const doc = await KnowledgeDocument.findById(req.params.id);
        if (!doc) {
            return res.status(404).json({ success: false, message: "Không tìm thấy tài liệu" });
        }

        const source = doc.sourceType === "google_sheet" ? `sheet:${doc._id}` : `file:${doc.fileName}`;
        const chunks = await Knowledge.find({ source }).select("_id").lean();
        await clearMongoKnowledgeVectorsByIds(chunks.map((chunk) => chunk._id));

        const deleted = await Knowledge.deleteMany({ source });
        try { if (doc.sourceType !== "google_sheet" && doc.fileUrl && fs.existsSync(doc.fileUrl)) fs.unlinkSync(doc.fileUrl); } catch (_) {}
        await KnowledgeDocument.findByIdAndDelete(req.params.id);

        return apiResponse(res, 200, `Đã xóa tài liệu và ${deleted.deletedCount} đoạn kiến thức liên quan`);
    } catch (error) {
        next(error);
    }
};
