import { jest } from "@jest/globals";

// ── Mock dependencies trước khi import auth.service ──────────────────────────
const mockUserFindOne = jest.fn();
const mockUserCreate = jest.fn();
const mockUserFindByIdAndUpdate = jest.fn();
const mockPatientCreate = jest.fn();
const mockPatientFindOne = jest.fn();

// Wrap mockUserFindOne so it supports .select() chaining (auth.service calls findOne().select("+password"))
const mockUserFindOneWithSelect = (...args) => {
    const result = mockUserFindOne(...args);
    // result is a Promise — wrap it with a select() that resolves to the same value
    const withSelect = { select: () => result };
    // Also make it thenable so code that doesn't call .select() still works
    if (result && typeof result.then === "function") {
        withSelect.then = result.then.bind(result);
        withSelect.catch = result.catch.bind(result);
    }
    return withSelect;
};

jest.unstable_mockModule("../../user/user.model.js", () => ({
    default: {
        findOne: mockUserFindOneWithSelect,
        create: mockUserCreate,
        findByIdAndUpdate: mockUserFindByIdAndUpdate,
    },
}));

const mockPatientFindOneWithSelect = (...args) => {
    const result = mockPatientFindOne(...args);
    return { select: () => result };
};

jest.unstable_mockModule("../../patient/patient.model.js", () => ({
    default: {
        findOne: mockPatientFindOneWithSelect,
        create: mockPatientCreate.mockResolvedValue({}),
    },
}));

jest.unstable_mockModule("../../../utils/sendEmail.js", () => ({
    sendEmail: jest.fn().mockResolvedValue(true),
}));

jest.unstable_mockModule("../../../utils/generateToken.js", () => ({
    generateAccessToken: jest.fn().mockReturnValue("mock_access_token"),
    generateRefreshToken: jest.fn().mockReturnValue("mock_refresh_token"),
}));

jest.unstable_mockModule("../../../utils/emailTemplates.js", () => ({
    welcomeRegisterTemplate: jest.fn().mockReturnValue({ subject: "Chào mừng", html: "<p>Hi</p>" }),
    resetPasswordTemplate: jest.fn().mockReturnValue({ subject: "Reset", html: "<p>Reset</p>" }),
}));

const { login, register, logout } = await import("../auth.service.js");

// ─────────────────────────────────────────────────────────────────────────────

describe("auth.service — login()", () => {
    beforeEach(() => jest.clearAllMocks());

    test("ném lỗi 401 khi email không tồn tại", async () => {
        mockUserFindOne.mockResolvedValue(null);
        await expect(login("notfound@test.com", "pass123")).rejects.toMatchObject({ statusCode: 401 });
    });

    test("ném lỗi 401 khi mật khẩu sai", async () => {
        mockUserFindOne.mockResolvedValue({
            isActive: true,
            matchPassword: jest.fn().mockResolvedValue(false),
        });
        await expect(login("user@test.com", "wrongpass")).rejects.toMatchObject({ statusCode: 401 });
    });

    test("ném lỗi 403 khi tài khoản bị vô hiệu hoá", async () => {
        mockUserFindOne.mockResolvedValue({
            isActive: false,
            matchPassword: jest.fn().mockResolvedValue(true),
        });
        await expect(login("user@test.com", "pass123")).rejects.toMatchObject({ statusCode: 403 });
    });

    test("trả về accessToken và refreshToken khi đăng nhập thành công", async () => {
        const fakeUser = {
            _id: "user123",
            fullName: "Test User",
            email: "user@test.com",
            phone: "0901234567",
            avatar: null,
            role: "patient",
            updatedAt: new Date(),
            isActive: true,
            matchPassword: jest.fn().mockResolvedValue(true),
            save: jest.fn().mockResolvedValue(true),
        };
        mockUserFindOne.mockResolvedValue(fakeUser);
        mockPatientFindOne.mockResolvedValue({ _id: "patient123" });

        const result = await login("user@test.com", "pass123");

        expect(result).toHaveProperty("accessToken", "mock_access_token");
        expect(result).toHaveProperty("refreshToken", "mock_refresh_token");
        expect(result.user.email).toBe("user@test.com");
        expect(result.user.role).toBe("patient");
    });
});

describe("auth.service — register()", () => {
    beforeEach(() => jest.clearAllMocks());

    test("ném lỗi khi email đã tồn tại", async () => {
        mockUserFindOne.mockResolvedValue({ email: "exists@test.com" });
        await expect(
            register({ fullName: "A", email: "exists@test.com", password: "abc123", phone: "" })
        ).rejects.toThrow("User already exists");
    });

    test("tạo user và patient profile khi dữ liệu hợp lệ", async () => {
        mockUserFindOne.mockResolvedValue(null);
        const fakeUser = {
            _id: "newuser1",
            fullName: "New User",
            email: "new@test.com",
            phone: "0901234567",
            avatar: null,
            role: "patient",
            updatedAt: new Date(),
            save: jest.fn().mockResolvedValue(true),
        };
        mockUserCreate.mockResolvedValue(fakeUser);
        mockPatientCreate.mockResolvedValue({ userId: "newuser1" });

        const result = await register({ fullName: "New User", email: "new@test.com", password: "abc123", phone: "0901234567" });

        expect(mockUserCreate).toHaveBeenCalledWith(expect.objectContaining({ role: "patient" }));
        expect(mockPatientCreate).toHaveBeenCalled();
        expect(result).toHaveProperty("accessToken");
    });
});

describe("auth.service — logout()", () => {
    test("xóa refreshToken của user", async () => {
        mockUserFindByIdAndUpdate.mockResolvedValue({});
        const result = await logout("user123");
        expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith("user123", { refreshToken: null });
        expect(result).toHaveProperty("message");
    });
});
