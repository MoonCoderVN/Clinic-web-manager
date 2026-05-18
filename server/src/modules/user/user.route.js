import express from "express";
import { getMe, updateProfile, uploadAvatar, changePassword } from "./user.controller.js";
import { protect } from "../../middlewares/authMiddleware.js";
import upload from "../../middlewares/uploadMiddleware.js";

const router = express.Router();

router.get("/me", protect, getMe);
router.get("/profile", protect, getMe); // alias backward compat
router.put("/profile", protect, updateProfile);
router.post("/avatar", protect, upload.single("avatar"), uploadAvatar);
router.put("/me/change-password", protect, changePassword);

export default router;

