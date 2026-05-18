import express from "express";
import { protect } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/roleMiddleware.js";
import {
    approveLeaveRequest,
    cancelLeaveRequest,
    createLeaveRequest,
    getLeaveRequests,
    getMyLeaveRequests,
    rejectLeaveRequest,
} from "./leaveRequest.controller.js";

const router = express.Router();

router.use(protect);

router.post("/", authorize("doctor"), createLeaveRequest);
router.get("/me", authorize("doctor"), getMyLeaveRequests);
router.put("/:id/cancel", authorize("doctor"), cancelLeaveRequest);

router.get("/", authorize("admin"), getLeaveRequests);
router.put("/:id/approve", authorize("admin"), approveLeaveRequest);
router.put("/:id/reject", authorize("admin"), rejectLeaveRequest);

export default router;
