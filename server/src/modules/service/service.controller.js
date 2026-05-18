import fs from "fs";

import Service from "./service.model.js";
import apiResponse from "../../utils/apiResponse.js";
import { emitPublic, emitToRole } from "../../realtime/socket.js";
import { localUploadPathFromPublicPath, toServicePublicPath } from "../../config/uploadPaths.js";

const emitServiceChanged = (action, service) => {
    const payload = { action, serviceId: service?._id?.toString() };
    emitToRole("admin", "service:changed", payload);
    emitPublic("service:changed", payload);
    emitPublic("public:landing-changed", { source: "service", action });
};

const getServicePayload = (body = {}, file) => {
    const payload = { ...body };

    if (payload.price !== undefined) payload.price = Number(payload.price) || 0;
    if (payload.duration !== undefined) payload.duration = Number(payload.duration) || 30;
    if (payload.isActive !== undefined) {
        payload.isActive = payload.isActive === true || payload.isActive === "true";
    }
    if (file) {
        payload.image = toServicePublicPath(file.filename);
    }

    return payload;
};

const removeLocalServiceImage = (imagePath) => {
    if (!imagePath || !imagePath.startsWith("/uploads/services/")) return;

    const filePath = localUploadPathFromPublicPath(imagePath);
    if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};

export const getServices = async (req, res, next) => {
    try {
        // Admin xem tất cả, user thường chỉ xem active
        const filter = req.user?.role === "admin"
            ? { isDeleted: { $ne: true } }
            : { isActive: true, isDeleted: { $ne: true } };
        const services = await Service.find(filter).sort({ createdAt: -1 });
        return apiResponse(res, 200, "Services list retrieved", services);
    } catch (error) {
        next(error);
    }
};

export const getServiceById = async (req, res, next) => {
    try {
        const service = await Service.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
        if (!service) return res.status(404).json({ success: false, message: "Service not found" });
        return apiResponse(res, 200, "Service details retrieved", service);
    } catch (error) {
        next(error);
    }
};

export const createService = async (req, res, next) => {
    try {
        const service = await Service.create(getServicePayload(req.body, req.file));
        emitServiceChanged("created", service);
        return apiResponse(res, 201, "Service created successfully", service);
    } catch (error) {
        next(error);
    }
};

export const updateService = async (req, res, next) => {
    try {
        const currentService = await Service.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
        if (!currentService) {
            return res.status(404).json({ success: false, message: "Service not found" });
        }

        const payload = getServicePayload(req.body, req.file);
        const service = await Service.findByIdAndUpdate(req.params.id, payload, { new: true });
        if (req.file && currentService.image) {
            removeLocalServiceImage(currentService.image);
        }
        emitServiceChanged("updated", service);
        return apiResponse(res, 200, "Service updated successfully", service);
    } catch (error) {
        next(error);
    }
};

export const deleteService = async (req, res, next) => {
    try {
        const service = await Service.findOneAndUpdate(
            { _id: req.params.id, isDeleted: { $ne: true } },
            { isActive: false, isDeleted: true },
            { new: true }
        );
        if (!service) {
            return res.status(404).json({ success: false, message: "Service not found" });
        }
        emitServiceChanged("deleted", service);
        return apiResponse(res, 200, "Service deleted successfully");
    } catch (error) {
        next(error);
    }
};
