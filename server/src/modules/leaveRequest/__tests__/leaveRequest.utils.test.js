import { jest } from "@jest/globals";

const mockLeaveRequestFindOne = jest.fn();

jest.unstable_mockModule("../leaveRequest.model.js", () => ({
    default: {
        findOne: (...a) => {
            const result = mockLeaveRequestFindOne(...a);
            return { lean: jest.fn().mockReturnValue(result) };
        },
    },
}));

const { isDoctorOffOnDate, getApprovedLeaveForDate, toDateOnly, toDateKey, filterSlotsByApprovedLeave } =
    await import("../leaveRequest.utils.js");

// ──────────────────────────────────────────────────────────────────────────────
// toDateOnly — pure helper
// ──────────────────────────────────────────────────────────────────────────────
describe("toDateOnly — chuyển đổi giá trị sang Date thuần ngày", () => {
    test("TC-01 | chuỗi ISO 'YYYY-MM-DD' → Date đúng ngày, giờ = 00:00:00", () => {
        const result = toDateOnly("2025-05-23");
        expect(result).toBeInstanceOf(Date);
        expect(result.getFullYear()).toBe(2025);
        expect(result.getMonth()).toBe(4); // tháng 5 (0-indexed)
        expect(result.getDate()).toBe(23);
        expect(result.getHours()).toBe(0);
        expect(result.getMinutes()).toBe(0);
    });

    test("TC-02 | null → trả về null", () => {
        expect(toDateOnly(null)).toBeNull();
    });

    test("TC-03 | chuỗi không hợp lệ → trả về null", () => {
        expect(toDateOnly("không phải ngày")).toBeNull();
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// toDateKey — pure helper
// ──────────────────────────────────────────────────────────────────────────────
describe("toDateKey — format ngày thành chuỗi YYYY-MM-DD", () => {
    test("TC-04 | Date hợp lệ → chuỗi 'YYYY-MM-DD'", () => {
        const result = toDateKey("2025-08-05");
        expect(result).toBe("2025-08-05");
    });

    test("TC-05 | giá trị null → null", () => {
        expect(toDateKey(null)).toBeNull();
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// isDoctorOffOnDate — logic nghiệp vụ
// ──────────────────────────────────────────────────────────────────────────────
describe("isDoctorOffOnDate — xác định bác sĩ có nghỉ phép không", () => {
    beforeEach(() => jest.clearAllMocks());

    test("TC-06 | tìm thấy leave request đã duyệt → trả về true", async () => {
        mockLeaveRequestFindOne.mockReturnValue(Promise.resolve({ _id: "lr001", status: "approved" }));
        const result = await isDoctorOffOnDate("doc001", "2025-06-10");
        expect(result).toBe(true);
    });

    test("TC-07 | không có leave request nào → trả về false", async () => {
        mockLeaveRequestFindOne.mockReturnValue(Promise.resolve(null));
        const result = await isDoctorOffOnDate("doc001", "2025-06-10");
        expect(result).toBe(false);
    });

    test("TC-08 | doctorUserId là null → không gọi DB, trả về false", async () => {
        const result = await isDoctorOffOnDate(null, "2025-06-10");
        expect(result).toBe(false);
        expect(mockLeaveRequestFindOne).not.toHaveBeenCalled();
    });

    test("TC-09 | ngày không hợp lệ → không gọi DB, trả về false", async () => {
        const result = await isDoctorOffOnDate("doc001", null);
        expect(result).toBe(false);
        expect(mockLeaveRequestFindOne).not.toHaveBeenCalled();
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// filterSlotsByApprovedLeave
// ──────────────────────────────────────────────────────────────────────────────
describe("filterSlotsByApprovedLeave — lọc slot khi bác sĩ nghỉ", () => {
    beforeEach(() => jest.clearAllMocks());

    test("TC-10 | bác sĩ đang nghỉ → trả về mảng rỗng", async () => {
        mockLeaveRequestFindOne.mockReturnValue(Promise.resolve({ _id: "lr001" }));
        const slots = ["08:00", "09:00", "10:00"];
        const result = await filterSlotsByApprovedLeave(slots, "doc001", "2025-06-10");
        expect(result).toEqual([]);
    });

    test("TC-11 | bác sĩ không nghỉ → trả về toàn bộ slots", async () => {
        mockLeaveRequestFindOne.mockReturnValue(Promise.resolve(null));
        const slots = ["08:00", "09:00", "10:00"];
        const result = await filterSlotsByApprovedLeave(slots, "doc001", "2025-06-10");
        expect(result).toEqual(slots);
    });
});
