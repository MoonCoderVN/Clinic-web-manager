import { jest } from "@jest/globals";

// ── Chainable mock helper ────────────────────────────────────────────────────
// Trả về object có thể await trực tiếp VÀ gọi .select()/.populate()/.lean()/.sort()
const chainable = (value) => {
  const p = Promise.resolve(value);
  const obj = {
    then: p.then.bind(p),
    catch: p.catch.bind(p),
  };
  const terminal = { then: p.then.bind(p), catch: p.catch.bind(p), lean: jest.fn().mockReturnValue(p) };
  obj.select = jest.fn().mockReturnValue(terminal);
  obj.lean   = jest.fn().mockReturnValue(p);
  obj.sort   = jest.fn().mockReturnValue(p);
  obj.populate = jest.fn().mockReturnValue(obj);
  return obj;
};

// ── Mock stubs ───────────────────────────────────────────────────────────────
const mockApptFindById = jest.fn();
const mockApptFind     = jest.fn();
const mockApptCreate   = jest.fn();

jest.unstable_mockModule("../appointment.model.js", () => ({
  default: {
    findById: (...a) => chainable(mockApptFindById(...a)),
    find:     (...a) => chainable(mockApptFind(...a)),
    create:   mockApptCreate,
  },
}));

const mockDoctorFindById = jest.fn();
const mockDoctorFindOne  = jest.fn();

// Paths below are relative to this test file (src/modules/appointment/__tests__/),
// and must resolve to the same absolute path that the controller resolves from its directory.
jest.unstable_mockModule("../../doctor/doctor.model.js", () => ({
  default: {
    findById: (...a) => chainable(mockDoctorFindById(...a)),
    findOne:  (...a) => chainable(mockDoctorFindOne(...a)),
  },
}));

const mockServiceFindById = jest.fn();

jest.unstable_mockModule("../../service/service.model.js", () => ({
  default: { findById: (...a) => chainable(mockServiceFindById(...a)) },
}));

const mockScheduleFindOne = jest.fn();

jest.unstable_mockModule("../../schedule/schedule.model.js", () => ({
  default: { findOne: (...a) => chainable(mockScheduleFindOne(...a)) },
}));

const mockUserFindById = jest.fn();
const mockUserFind     = jest.fn();

jest.unstable_mockModule("../../user/user.model.js", () => ({
  default: {
    findById: (...a) => chainable(mockUserFindById(...a)),
    find:     (...a) => chainable(mockUserFind(...a)),
  },
}));

jest.unstable_mockModule("../../notification/notification.service.js", () => ({
  createNotification: jest.fn().mockResolvedValue({}),
}));

jest.unstable_mockModule("../../leaveRequest/leaveRequest.utils.js", () => ({
  isDoctorOffOnDate: jest.fn().mockResolvedValue(false),
}));

jest.unstable_mockModule("../../../utils/sendEmail.js", () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));

jest.unstable_mockModule("../../../utils/emailTemplates.js", () => ({
  appointmentBookedTemplate:     jest.fn().mockReturnValue({ subject: "test", html: "" }),
  appointmentConfirmedTemplate:  jest.fn().mockReturnValue({ subject: "test", html: "" }),
}));

jest.unstable_mockModule("../../../realtime/socket.js", () => ({
  emitAppointmentChanged: jest.fn().mockResolvedValue({}),
  emitToUser:  jest.fn(),
  emitToRole:  jest.fn(),
}));

// apiResponse gọi res.status(code).json(...) — giữ đúng như thật để test res.status
jest.unstable_mockModule("../../../utils/apiResponse.js", () => ({
  default: (res, status, message, data) =>
    res.status(status).json({ success: true, message, data }),
}));

// ── Import handlers sau khi mock đã đăng ký ─────────────────────────────────
const { createAppointment, cancelAppointment, rescheduleAppointment } =
  await import("../appointment.controller.js");

// ── Test helpers ─────────────────────────────────────────────────────────────
const makeReq = (overrides = {}) => ({
  user:   { id: "patient001", role: "patient" },
  params: {},
  query:  {},
  body:   {},
  ...overrides,
});

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const next = jest.fn();

// Trả về ngày tương lai YYYY-MM-DD (mặc định 3 ngày sau)
const futureDate = (days = 3) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

// ──────────────────────────────────────────────────────────────────────────────
// createAppointment
// ──────────────────────────────────────────────────────────────────────────────
describe("createAppointment — xác nhận quy tắc nghiệp vụ", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApptFind.mockReturnValue([]); // mặc định không có lịch xung đột
    mockUserFind.mockReturnValue([]);  // không có admin để notify
  });

  test("TC-01 | 400 — thiếu thông tin bắt buộc (không có doctorId)", async () => {
    const req = makeReq({ body: { serviceId: "svc001", appointmentDate: futureDate(), startTime: "09:00" } });
    const res = makeRes();
    await createAppointment(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test("TC-02 | 400 — ngày đặt lịch đã qua (ngày trong quá khứ)", async () => {
    const req = makeReq({
      body: { serviceId: "svc001", doctorId: "doc001", appointmentDate: "2020-06-15", startTime: "09:00" },
    });
    const res = makeRes();
    await createAppointment(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.any(String) })
    );
  });

  test("TC-03 | 404 — bác sĩ không tồn tại trong hệ thống", async () => {
    mockServiceFindById.mockReturnValue({ _id: "svc001", duration: 30, name: "Tẩy trắng" });
    mockDoctorFindById.mockReturnValue(null);

    const req = makeReq({
      body: { serviceId: "svc001", doctorId: "nonexistent_doc", appointmentDate: futureDate(), startTime: "09:00" },
    });
    const res = makeRes();
    await createAppointment(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test("TC-04 | 400 — bác sĩ không có ca làm việc vào ngày được chọn", async () => {
    mockServiceFindById.mockReturnValue({ _id: "svc001", duration: 30 });
    mockDoctorFindById.mockReturnValue({ _id: "doc001", userId: "docUser001" });
    mockScheduleFindOne.mockReturnValue(null); // không có lịch làm việc

    const req = makeReq({
      body: { serviceId: "svc001", doctorId: "doc001", appointmentDate: futureDate(), startTime: "09:00" },
    });
    const res = makeRes();
    await createAppointment(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("TC-05 | 409 — race condition: slot vừa bị đặt đồng thời (lỗi duplicate key 11000)", async () => {
    mockServiceFindById.mockReturnValue({ _id: "svc001", duration: 30 });
    mockDoctorFindById.mockReturnValue({ _id: "doc001", userId: "docUser001" });
    mockScheduleFindOne.mockReturnValue({ startTime: "08:00", endTime: "17:00", isOff: false });
    mockApptCreate.mockRejectedValue({ code: 11000 }); // MongoDB duplicate key

    const req = makeReq({
      body: { serviceId: "svc001", doctorId: "doc001", appointmentDate: futureDate(), startTime: "09:00" },
    });
    const res = makeRes();
    await createAppointment(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("vừa được đặt") })
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// cancelAppointment
// ──────────────────────────────────────────────────────────────────────────────
describe("cancelAppointment — xác nhận quy tắc nghiệp vụ", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserFind.mockReturnValue([]);
  });

  test("TC-06 | 404 — lịch hẹn không tồn tại", async () => {
    mockApptFindById.mockReturnValue(null);
    const req = makeReq({ params: { id: "appt_not_found" } });
    const res = makeRes();
    await cancelAppointment(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("TC-07 | 400 — không thể hủy lịch đã ở trạng thái 'cancelled'", async () => {
    mockApptFindById.mockReturnValue({ _id: "appt001", status: "cancelled", patientId: "patient001" });
    const req = makeReq({ params: { id: "appt001" } });
    const res = makeRes();
    await cancelAppointment(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("cancelled") })
    );
  });

  test("TC-08 | 400 — không thể hủy lịch đã hoàn thành", async () => {
    mockApptFindById.mockReturnValue({ _id: "appt002", status: "completed", patientId: "patient001" });
    const req = makeReq({ params: { id: "appt002" } });
    const res = makeRes();
    await cancelAppointment(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("completed") })
    );
  });

  test("TC-09 | 403 — bệnh nhân không được hủy lịch hẹn của người khác", async () => {
    mockApptFindById.mockReturnValue({
      _id: "appt003",
      status: "pending",
      patientId: "another_patient_999", // khác với user đang đăng nhập
    });
    const req = makeReq({
      user:   { id: "patient001", role: "patient" },
      params: { id: "appt003" },
    });
    const res = makeRes();
    await cancelAppointment(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("quyền") })
    );
  });

  test("TC-10 | 400 — bệnh nhân không thể hủy trong vòng 2 giờ trước khi khám", async () => {
    // Tạo thời điểm khám = hiện tại + 1 giờ (nằm trong cửa sổ 2h bị chặn)
    const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
    const dateOnly  = new Date(inOneHour.getFullYear(), inOneHour.getMonth(), inOneHour.getDate());
    const hh = String(inOneHour.getHours()).padStart(2, "0");
    const mm = String(inOneHour.getMinutes()).padStart(2, "0");

    mockApptFindById.mockReturnValue({
      _id:             "appt004",
      status:          "confirmed",
      patientId:       "patient001",
      appointmentDate: dateOnly,
      startTime:       `${hh}:${mm}`,
    });

    const req = makeReq({
      user:   { id: "patient001", role: "patient" },
      params: { id: "appt004" },
    });
    const res = makeRes();
    await cancelAppointment(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("2 giờ") })
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// rescheduleAppointment
// ──────────────────────────────────────────────────────────────────────────────
describe("rescheduleAppointment — xác nhận quy tắc nghiệp vụ", () => {
  beforeEach(() => jest.clearAllMocks());

  test("TC-11 | 400 — thiếu newTime khi đổi lịch", async () => {
    const req = makeReq({
      params: { id: "appt001" },
      body:   { newDate: futureDate() }, // thiếu newTime
    });
    const res = makeRes();
    await rescheduleAppointment(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("TC-12 | 404 — lịch hẹn không tồn tại khi cố đổi lịch", async () => {
    mockApptFindById.mockReturnValue(null);
    const req = makeReq({
      params: { id: "nonexistent_appt" },
      body:   { newDate: futureDate(), newTime: "10:00" },
    });
    const res = makeRes();
    await rescheduleAppointment(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
