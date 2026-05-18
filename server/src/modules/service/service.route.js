import express from "express";
import { getServices, getServiceById, createService, updateService, deleteService } from "./service.controller.js";
import { protect, optionalProtect } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/roleMiddleware.js";
import { serviceImageUpload } from "../../middlewares/uploadMiddleware.js";

const router = express.Router();

// Public (nhưng attach user nếu có token — để admin thấy tất cả)
router.get("/", optionalProtect, getServices);
router.get("/:id", getServiceById);

// Admin only routes
router.use(protect);
router.use(authorize("admin"));
router.post("/", serviceImageUpload.single("image"), createService);
router.put("/:id", serviceImageUpload.single("image"), updateService);
router.delete("/:id", deleteService);

export default router;
