import { jest } from "@jest/globals";

// Mock tất cả module nặng trước khi import controller
jest.unstable_mockModule("../chatSession.model.js", () => ({ default: {} }));
jest.unstable_mockModule("../../appointment/appointment.model.js", () => ({ default: {} }));
jest.unstable_mockModule("../../doctor/doctor.model.js", () => ({ default: {} }));
jest.unstable_mockModule("../../service/service.model.js", () => ({ default: {} }));
jest.unstable_mockModule("../../schedule/schedule.model.js", () => ({ default: {} }));
jest.unstable_mockModule("../../../rag/chain/ragChain.js", () => ({
    runRagChain: jest.fn(),
    runRagChainStream: jest.fn(),
    retrieveRagContext: jest.fn(),
}));
jest.unstable_mockModule("../../schedule/schedule.controller.js", () => ({
    computeDoctorAvailability: jest.fn(),
}));
jest.unstable_mockModule("../../leaveRequest/leaveRequest.utils.js", () => ({
    filterSlotsByApprovedLeave: jest.fn(),
}));
jest.unstable_mockModule("../../../utils/apiResponse.js", () => ({ default: jest.fn() }));

const { classifyChatIntent } = await import("../chat.controller.js");

describe("classifyChatIntent — phân loại ý định chatbot", () => {
    test("trả về BOOKING_FLOW khi bookingContext đang active", () => {
        const result = classifyChatIntent("bất kỳ nội dung gì", { step: "SELECT_SERVICE" });
        expect(result.intent).toBe("BOOKING_FLOW");
        expect(result.bookingAction).toBe(true);
    });

    test("nhận diện BOOKING_FLOW khi người dùng muốn bắt đầu đặt lịch", () => {
        const result = classifyChatIntent("Tôi muốn đặt lịch khám");
        expect(result.intent).toBe("BOOKING_FLOW");
        expect(result.bookingAction).toBe(true);
    });

    test("nhận diện BOOKING_FLOW khi dùng từ 'đăng ký lich'", () => {
        const result = classifyChatIntent("Mình muốn đăng ký lịch khám");
        expect(result.intent).toBe("BOOKING_FLOW");
    });

    test("nhận diện hasSpecificEntities khi có ngày cụ thể", () => {
        const result = classifyChatIntent("Thứ 3 tuần tới còn slot không?");
        expect(result.bookingAction).toBe(true);
        expect(result.hasSpecificEntities).toBe(true);
    });

    test("nhận diện wantsServiceInfo khi hỏi giá dịch vụ", () => {
        const result = classifyChatIntent("Giá niềng răng bao nhiêu?");
        expect(result.wantsServiceInfo).toBe(true);
    });

    test("nhận diện wantsDoctorInfo khi hỏi danh sách bác sĩ", () => {
        const result = classifyChatIntent("Phòng khám có bác sĩ nào?");
        expect(result.wantsDoctorInfo).toBe(true);
    });

    test("không phát hiện booking action trong câu hỏi thông thường", () => {
        const result = classifyChatIntent("Giờ làm việc của phòng khám là mấy giờ?");
        expect(result.bookingAction).toBe(false);
    });

    test("phân loại được câu rỗng mà không crash", () => {
        expect(() => classifyChatIntent("")).not.toThrow();
        expect(() => classifyChatIntent()).not.toThrow();
    });
});
