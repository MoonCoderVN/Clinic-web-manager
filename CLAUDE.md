# CLAUDE.md — DentaCare Clinic Management System

DentaCare là hệ thống quản lý phòng khám nha khoa full-stack gồm 3 service: **client** (React 19 + Vite), **server** (Node.js/Express), **ai_service** (Python/FastAPI). Không dùng TypeScript. Không dùng Redux.

---

## 1. Ràng buộc kiến trúc — TUYỆT ĐỐI KHÔNG thay đổi

### Tech stack cố định

- **Frontend:** React 19, Vite, Tailwind CSS v4, shadcn/ui, React Router v7, Axios, Socket.io-client, Recharts, Sonner, Lucide React
- **Backend:** Node.js, Express.js, MongoDB, Mongoose, JWT (access+refresh), Socket.io, LangChain, Google Gemini, Nodemailer, Winston, Joi, node-cron
- **AI Service:** Python FastAPI, Motor (async MongoDB), Google Generative AI, LangChain, Uvicorn (port 8000) — Node.js chỉ proxy request sang AI service, không chạy RAG trực tiếp
- Không thêm TypeScript vào bất kỳ layer nào
- Không thêm Redux hoặc thư viện state management khác — chỉ dùng React Context API
- Không dùng SQL — chỉ MongoDB + Mongoose
- Không thêm thư viện AI mới (không OpenAI, không HuggingFace) nếu không có chỉ thị rõ ràng

### Cấu trúc module backend — MVC modular, KHÔNG thay đổi pattern

Mỗi module nằm tại `server/src/modules/MODULE_NAME/` với đúng các file:

```
MODULE_NAME.model.js       — Mongoose schema
MODULE_NAME.controller.js  — request handlers
MODULE_NAME.route.js       — Express routes
MODULE_NAME.service.js     — business logic (nếu cần)
```

Validation đặt tại `server/src/validations/MODULE_NAME.validation.js` hoặc trong thư mục module.

### Các module hiện có — KHÔNG tạo module mới nếu không có chỉ thị rõ ràng

`auth`, `user`, `patient`, `doctor`, `appointment`, `service`, `schedule`, `examResult`, `notification`, `chat`, `knowledge`, `leaveRequest`, `admin`

### Cấu trúc trang frontend — KHÔNG tái cơ cấu

```
client/src/pages/admin/    — trang quản trị
client/src/pages/doctor/   — trang bác sĩ
client/src/pages/patient/  — trang bệnh nhân
client/src/pages/public/   — landing, auth
client/src/pages/shared/   — trang dùng chung
```

### Ports cố định

| Service | Port |
|---|---|
| Frontend | 5173 |
| Backend API | 5002 |
| AI Service | 8000 |

---

## 2. Quy ước đặt tên — tuân thủ chính xác theo từng layer

### Backend (server/) — JavaScript

| Đối tượng | Convention | Ví dụ |
|---|---|---|
| Tên file | kebab-case | `user.controller.js`, `auth.route.js` |
| Biến / hàm | camelCase | `createAppointment`, `getUserById` |
| Class / Schema | PascalCase | `Appointment`, `UserSchema` |
| Trường DB | camelCase | `appointmentDate`, `startTime`, `isActive` |

### Frontend (client/) — JavaScript + JSX

| Đối tượng | Convention | Ví dụ |
|---|---|---|
| Component file | PascalCase.jsx | `ChatWindow.jsx`, `AdminOverview.jsx` |
| Utility file | kebab-case.js | `format-date.js`, `decode-token.js` |
| Hook | camelCase với tiền tố `use` | `useAuth`, `useRealtimeEvent` |
| Context | PascalCase + `Context` suffix | `AuthContext`, `SocketContext` |
| API module | camelCase.api.js | `appointments.api.js`, `doctors.api.js` |

### AI Service (ai_service/) — Python

- Tất cả file và hàm dùng `snake_case`
- Ví dụ: `run_rag_chain`, `classify_intent`, `conduct_booking_flow`

---

## 3. Phạm vi tính năng

- **KHÔNG** tự thêm tính năng ngoài phạm vi yêu cầu hiện tại
- **KHÔNG** tạo module mới (server hoặc client) nếu chưa được chỉ định rõ ràng
- **KHÔNG** thêm route API mới nếu chưa được chỉ định
- Khi yêu cầu mơ hồ hoặc có thể mở rộng scope, hỏi xác nhận trước khi thực hiện
- Nếu tính năng mới cần module mới, trình bày kế hoạch (tên file, cấu trúc) và chờ duyệt

---

## 4. Ràng buộc refactoring

- **KHÔNG** đổi tên file đã tồn tại nếu không có lý do cụ thể
- **KHÔNG** tái cơ cấu thư mục (`pages/`, `modules/`, `api/`, `context/`) nếu không có chỉ thị
- **KHÔNG** thêm abstraction layer mới (repository pattern, v.v.) nếu không được yêu cầu
- **KHÔNG** đổi `CommonJS require` sang `ESM import` hay ngược lại trên toàn dự án
- **KHÔNG** tự ý xóa field khỏi Mongoose schema — luôn dùng `deletedAt` để soft delete
- **KHÔNG** thay thế Socket.io bằng polling
- Chỉ sửa file liên quan trực tiếp đến yêu cầu — tránh thay đổi lan sang file không liên quan

---

## 5. Utilities bắt buộc tái sử dụng — KHÔNG tạo lại

### Backend

| Utility | Đường dẫn | Mục đích |
|---|---|---|
| `apiResponse` | `server/src/utils/apiResponse.js` | Chuẩn hóa response JSON |
| `sendEmail` | `server/src/utils/sendEmail.js` | Gửi email qua Nodemailer |
| `generateAccessToken` / `generateRefreshToken` | `server/src/utils/generateToken.js` | Tạo JWT |
| `logger` | `server/src/utils/logger.js` | Winston logger — dùng thay `console.log` |
| `emailTemplates` | `server/src/utils/emailTemplates.js` | Template HTML email |
| `protect` / `optionalProtect` | `server/src/middlewares/authMiddleware.js` | Xác thực JWT |
| `authorize(...roles)` | `server/src/middlewares/roleMiddleware.js` | Kiểm tra quyền theo role |
| `validate` / `validateQuery` / `validateParams` | `server/src/middlewares/validation.js` | Validate Joi schema |
| `errorHandler` | `server/src/middlewares/errorHandler.js` | Xử lý lỗi tập trung |
| `upload` / `serviceImageUpload` / `dentalRecordUpload` | `server/src/middlewares/uploadMiddleware.js` | Upload file Multer |
| `createNotification` | `server/src/modules/notification/notification.service.js` | Tạo notification + emit realtime |
| `emitToUser` / `emitToRole` / `emitToDoctor` / `emitPublic` | `server/src/realtime/socket.js` | Phát sự kiện Socket.io |

### Frontend

| Utility | Đường dẫn | Mục đích |
|---|---|---|
| `httpClient` | `client/src/api/httpClient.js` | Axios instance với interceptors — **KHÔNG bypass bằng `fetch` hay `axios` trực tiếp** |
| `useAuth` | `client/src/context/AuthContext.jsx` | Hook lấy user/token/role |
| `useSocket` | `client/src/context/SocketContext.jsx` | Hook lấy socket instance |
| `useRealtimeEvent` / `useRealtimeRefresh` | `client/src/hooks/useRealtimeEvent.js` | Lắng nghe sự kiện realtime |
| `formatDateShort` / `formatDateLong` | `client/src/utils/formatDate.js` | Format ngày tháng tiếng Việt |

---

## 6. Format API response

Tất cả response phải dùng `apiResponse` từ `server/src/utils/apiResponse.js`:

```js
// apiResponse(res, statusCode, message, data = null, success = true)
return apiResponse(res, 200, "Lấy danh sách thành công", { appointments });
return apiResponse(res, 404, "Không tìm thấy lịch hẹn", null, false);
```

Shape chuẩn:
```json
{ "success": true, "message": "...", "data": null }
```

- **KHÔNG** dùng `res.json({ ... })` trực tiếp mà không qua `apiResponse`
- **KHÔNG** wrap thêm lớp `result`, `payload`, v.v.
- Lỗi tập trung qua `errorHandler` — ném `Error` với `err.statusCode` nếu cần HTTP status tùy chỉnh
- Validation error do `validate(schema)` middleware xử lý — không duplicate logic validate trong controller

---

## 7. Pattern thêm code mới

### Thêm route/controller trong module đã có

1. Thêm Joi schema vào file validation của module
2. Viết handler trong `MODULE_NAME.controller.js` — gọi `apiResponse`, dùng `try/catch`
3. Đăng ký route trong `MODULE_NAME.route.js` theo thứ tự: `protect` → `authorize(...)` → `validate(schema)` → handler
4. Nếu cần emit realtime: dùng hàm emit từ `server/src/realtime/socket.js`
5. Nếu cần notification: gọi `createNotification` từ `notification.service.js`

```js
// Thứ tự middleware chuẩn
router.post("/", protect, authorize("admin"), validate(createSchema), createHandler);
```

### Thêm API module frontend mới

```js
// client/src/api/module.api.js
import httpClient from "./httpClient";
export const moduleApi = {
  getAll: (params) => httpClient.get("/endpoint", { params }),
  create: (payload) => httpClient.post("/endpoint", payload),
};
export default moduleApi;
```

Re-export từ `client/src/api/index.js`.

### Thêm trang frontend mới

- Đặt đúng thư mục theo role: `pages/admin/`, `pages/doctor/`, `pages/patient/`, `pages/public/`, `pages/shared/`
- Tên file: `PascalCase.jsx`
- Dùng `useAuth()` để lấy user/role — không đọc `localStorage` trực tiếp
- Dùng `useRealtimeEvent` / `useRealtimeRefresh` — không dùng polling

### Thêm model Mongoose mới (chỉ khi được chỉ thị)

- Luôn thêm `deletedAt: { type: Date, select: false }` để hỗ trợ soft delete
- Trường dùng camelCase — không dùng `deleted: Boolean`
- Thêm index cho các field được query thường xuyên
- **KHÔNG** hard delete — luôn soft delete qua `deletedAt`

### Thêm event realtime mới

- Đăng ký event name mới trong `client/src/context/SocketContext.jsx`
- Phát event từ server qua hàm emit trong `server/src/realtime/socket.js`
- Format tên event: `entity:action` (ví dụ: `appointment:changed`, `notification:new`)
- Phòng Socket.io hiện có: `public`, `user:{userId}`, `role:{role}`, `doctor:{doctorId}` — không tạo phòng mới tùy tiện

---

## 8. Lưu ý bổ sung

- **Logging:** Dùng `logger` (Winston) thay cho `console.log` trong server code — Python AI service dùng `print()` cho logging
- **Rate limiting:** Đã áp dụng toàn cục trong `server/src/index.js` — không tạo rate limiter riêng
- **Security headers:** Helmet đã được cấu hình trong `server/src/index.js` — không thêm middleware bảo mật riêng
- **Upload file:** Dùng middleware từ `uploadMiddleware.js` — không dùng Multer trực tiếp
- **Cron jobs:** Thêm vào `server/src/jobs/`, import vào `server/src/index.js`, dùng `node-cron`
- **Pagination:** Dùng `page`/`limit` query params (default limit=20, max=100); trả về `{ data, total, page, totalPages }` — xem `getAllPatients` trong `admin.controller.js` làm mẫu
- **Tests:** Pattern dùng `jest.unstable_mockModule` (ESM), chainable mock helper — xem `appointment.controller.test.js` làm mẫu; mock path tính từ vị trí file TEST (không phải file được test)
- **Roles hợp lệ:** `patient`, `doctor`, `admin` — không thêm role mới
- **Trạng thái appointment:** `pending`, `confirmed`, `rescheduled`, `in_progress`, `completed`, `cancelled`
- **Format time:** Giờ dùng chuỗi `"HH:MM"` (ví dụ `"08:00"`), ngày dùng `Date` object hoặc ISO string
- **Không commit file `.env`** — biến bắt buộc: `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `MAIL_USER`, `MAIL_PASS`, `GEMINI_API_KEY`
- **Embeddings AI:** Chỉ dùng Google Gemini — không dùng provider khác
- **Path alias frontend:** Dùng `@/` cho `client/src/` (định nghĩa trong `vite.config.js`)
