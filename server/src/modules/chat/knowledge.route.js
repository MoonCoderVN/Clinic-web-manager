import express from "express";
import multer from "multer";
import path from "path";
import { getKnowledge, createKnowledge, updateKnowledge, deleteKnowledge, testKnowledgeQuery } from "./knowledge.controller.js";
import { uploadDocument, getDocuments, deleteDocument, reindexDocument, createSheetSource } from "./documentUpload.controller.js";
import { protect } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/roleMiddleware.js";

const router = express.Router();

// ── Multer config: store uploads in /uploads/knowledge-docs ──────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/knowledge-docs/");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowed = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/csv",
        "text/plain",
    ];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Chỉ chấp nhận file PDF, Word (.doc/.docx), Excel (.xls/.xlsx), CSV hoặc TXT"), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
});

router.use(protect);
router.use(authorize("admin"));

// Document upload for RAG — đặt TRƯỚC /:id để tránh route conflict
router.get("/documents", getDocuments);
router.post("/documents/upload", upload.single("file"), uploadDocument);
router.post("/sheets", createSheetSource);
router.post("/documents/:id/reindex", reindexDocument);
router.delete("/documents/:id", deleteDocument);

// Knowledge CRUD (manual entries)
router.post("/test-query", testKnowledgeQuery);
router.get("/", getKnowledge);
router.post("/", createKnowledge);
router.put("/:id", updateKnowledge);
router.delete("/:id", deleteKnowledge);

export default router;
