import multer from "multer";
import path from "path";
import { AVATARS_DIR, DENTAL_RECORDS_DIR, SERVICES_DIR, ensureUploadDirs } from "../config/uploadPaths.js";

ensureUploadDirs();

const createStorage = ({ destinationDir, filenamePrefix }) => multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, destinationDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const owner = req.user?.id || "system";
        const uniqueName = `${filenamePrefix}_${owner}_${Date.now()}${ext}`;
        cb(null, uniqueName);
    },
});

const fileFilter = (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extOk = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowedTypes.test(file.mimetype.replace("image/", ""));
    if (extOk && mimeOk) {
        cb(null, true);
    } else {
        cb(new Error("Chỉ chấp nhận file ảnh (jpg, png, gif, webp)"), false);
    }
};

const dentalRecordFileFilter = (_req, file, cb) => {
    const allowedExt = /jpeg|jpg|png|gif|webp|pdf/;
    const extOk = allowedExt.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = /^image\/(jpeg|jpg|png|gif|webp)$/.test(file.mimetype) || file.mimetype === "application/pdf";
    if (extOk && mimeOk) {
        cb(null, true);
    } else {
        cb(new Error("Chi chap nhan file anh hoac PDF cho ho so nha khoa"), false);
    }
};

const createImageUpload = (storage) => multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
});

const upload = createImageUpload(createStorage({
    destinationDir: AVATARS_DIR,
    filenamePrefix: "avatar",
}));

export const serviceImageUpload = createImageUpload(createStorage({
    destinationDir: SERVICES_DIR,
    filenamePrefix: "service",
}));

export const dentalRecordUpload = multer({
    storage: createStorage({
        destinationDir: DENTAL_RECORDS_DIR,
        filenamePrefix: "record",
    }),
    fileFilter: dentalRecordFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
});

export default upload;
