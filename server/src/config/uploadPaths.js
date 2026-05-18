import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SERVER_ROOT = path.resolve(__dirname, "../..");
export const UPLOADS_DIR = path.join(SERVER_ROOT, "uploads");
export const AVATARS_DIR = path.join(UPLOADS_DIR, "avatars");
export const SERVICES_DIR = path.join(UPLOADS_DIR, "services");
export const DENTAL_RECORDS_DIR = path.join(UPLOADS_DIR, "dental-records");

export const ensureUploadDirs = () => {
    fs.mkdirSync(AVATARS_DIR, { recursive: true });
    fs.mkdirSync(SERVICES_DIR, { recursive: true });
    fs.mkdirSync(DENTAL_RECORDS_DIR, { recursive: true });
};

export const toAvatarPublicPath = (filename) => `/uploads/avatars/${filename}`;
export const toServicePublicPath = (filename) => `/uploads/services/${filename}`;
export const toDentalRecordPublicPath = (filename) => `/uploads/dental-records/${filename}`;

export const localUploadPathFromPublicPath = (publicPath) => {
    if (!publicPath || !publicPath.startsWith("/uploads/")) return null;

    const relativePath = publicPath.replace(/^\/uploads\//, "");
    return path.join(UPLOADS_DIR, relativePath);
};
