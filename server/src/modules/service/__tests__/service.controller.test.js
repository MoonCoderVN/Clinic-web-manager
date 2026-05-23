import { jest } from "@jest/globals";

// ── Mock stubs ───────────────────────────────────────────────────────────────
const mockServiceFind     = jest.fn();
const mockServiceFindOne  = jest.fn();
const mockServiceCreate   = jest.fn();

jest.unstable_mockModule("../service.model.js", () => ({
    default: {
        find:    (...a) => {
            const p = Promise.resolve(mockServiceFind(...a));
            return { sort: jest.fn().mockReturnValue(p) };
        },
        findOne: (...a) => Promise.resolve(mockServiceFindOne(...a)),
        create:  (...a) => Promise.resolve(mockServiceCreate(...a)),
    },
}));

jest.unstable_mockModule("../../../realtime/socket.js", () => ({
    emitPublic: jest.fn(),
    emitToRole: jest.fn(),
}));

jest.unstable_mockModule("../../../config/uploadPaths.js", () => ({
    localUploadPathFromPublicPath: jest.fn(),
    toServicePublicPath: jest.fn().mockReturnValue("/uploads/services/test.jpg"),
    UPLOADS_DIR: "/tmp/uploads",
    ensureUploadDirs: jest.fn(),
}));

jest.unstable_mockModule("fs", () => ({
    default: { existsSync: jest.fn().mockReturnValue(false), unlinkSync: jest.fn() },
}));

jest.unstable_mockModule("../../../utils/apiResponse.js", () => ({
    default: (res, status, message, data) => res.status(status).json({ success: true, message, data }),
}));

const { getServices, getServiceById, createService } = await import("../service.controller.js");

// ── Helpers ──────────────────────────────────────────────────────────────────
const makeReq = (overrides = {}) => ({
    user:   { id: "user001", role: "patient" },
    params: {},
    query:  {},
    body:   {},
    file:   null,
    ...overrides,
});

const makeRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
};

const next = jest.fn();

// ──────────────────────────────────────────────────────────────────────────────
// getServices
// ──────────────────────────────────────────────────────────────────────────────
describe("getServices — lấy danh sách dịch vụ", () => {
    beforeEach(() => jest.clearAllMocks());

    test("TC-01 | bệnh nhân chỉ nhận được dịch vụ active", async () => {
        const fakeServices = [{ _id: "svc001", name: "Tẩy trắng", isActive: true }];
        mockServiceFind.mockReturnValue(fakeServices);

        const req = makeReq({ user: { role: "patient" } });
        const res = makeRes();
        await getServices(req, res, next);

        // Filter phải có isActive: true
        const callArg = mockServiceFind.mock.calls[0][0];
        expect(callArg).toMatchObject({ isActive: true });
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("TC-02 | admin nhận được cả dịch vụ inactive (không có filter isActive)", async () => {
        mockServiceFind.mockReturnValue([{ _id: "svc002", isActive: false }]);

        const req = makeReq({ user: { role: "admin" } });
        const res = makeRes();
        await getServices(req, res, next);

        const callArg = mockServiceFind.mock.calls[0][0];
        expect(callArg).not.toHaveProperty("isActive");
        expect(res.status).toHaveBeenCalledWith(200);
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// getServiceById
// ──────────────────────────────────────────────────────────────────────────────
describe("getServiceById — lấy chi tiết dịch vụ", () => {
    beforeEach(() => jest.clearAllMocks());

    test("TC-03 | tìm thấy dịch vụ → 200", async () => {
        mockServiceFindOne.mockReturnValue({ _id: "svc001", name: "Niềng răng", isActive: true });

        const req = makeReq({ params: { id: "svc001" } });
        const res = makeRes();
        await getServiceById(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("TC-04 | không tìm thấy dịch vụ → 404", async () => {
        mockServiceFindOne.mockReturnValue(null);

        const req = makeReq({ params: { id: "nonexistent" } });
        const res = makeRes();
        await getServiceById(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// createService
// ──────────────────────────────────────────────────────────────────────────────
describe("createService — tạo dịch vụ mới", () => {
    beforeEach(() => jest.clearAllMocks());

    test("TC-05 | body hợp lệ → 201 + trả về service đã tạo", async () => {
        const created = { _id: "svc003", name: "Nhổ răng khôn", price: 500000, isActive: true };
        mockServiceCreate.mockReturnValue(created);

        const req = makeReq({
            user: { role: "admin" },
            body: { name: "Nhổ răng khôn", price: "500000", duration: "60" },
        });
        const res = makeRes();
        await createService(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: created }));
    });

    test("TC-06 | Service.create ném lỗi → gọi next(error)", async () => {
        const err = new Error("DB error");
        mockServiceCreate.mockRejectedValue(err);

        const req = makeReq({
            user: { role: "admin" },
            body: { name: "Test", price: "100000" },
        });
        const res = makeRes();
        await createService(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });
});
