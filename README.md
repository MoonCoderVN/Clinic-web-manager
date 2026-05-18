# 🦷 DentaCare MERN

Hệ thống quản lý phòng khám nha khoa full-stack sử dụng MERN Stack.

## 🛠️ Tech Stack

**Frontend:**
- React 19 + Vite 8
- Tailwind CSS v4
- shadcn/ui + Radix UI
- React Router DOM v7
- Axios
- Sonner (Toast notifications)
- Lucide React (Icons)

**Backend:**
- Node.js + Express.js
- MongoDB + Mongoose
- JWT Authentication
- bcryptjs
- LangChain + ChromaDB (RAG Chatbot)

## 📁 Cấu trúc project

```
DentaCare-MERN/
├── client/          # React frontend (Vite)
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── context/     # React context (Auth, Chat)
│   │   ├── pages/       # Trang cho patient/doctor/admin
│   │   ├── services/    # Axios instance
│   │   └── utils/       # Tiện ích
│   └── .env.example
│
└── server/          # Express.js backend
    ├── src/
    │   ├── config/      # DB config, seedAdmin
    │   ├── middlewares/ # Auth, error handler
    │   ├── modules/     # auth, user, patient, doctor, ...
    │   ├── rag/         # AI RAG chatbot
    │   └── utils/
    └── .env.example
```

## 🚀 Hướng dẫn cài đặt

### 1. Clone repository
```bash
git clone https://github.com/MoonCoderVN/DentaCare-MERN.git
cd DentaCare-MERN
```

### 2. Cài đặt Server
```bash
cd server
npm install
cp .env.example .env
# Chỉnh sửa .env với thông tin của bạn
npm run dev
```

### 3. Cài đặt Client
```bash
cd client
npm install
cp .env.example .env
# Chỉnh sửa .env nếu cần
npm run dev
```

## 🔑 Tài khoản mặc định

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@dentacare.com | Admin@123456 |

> ⚠️ Hãy đổi mật khẩu sau khi đăng nhập lần đầu!

## 🌐 Truy cập

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5002/api

## 📋 Tính năng

- ✅ Đăng nhập / Đăng ký (JWT)
- ✅ Phân quyền: Admin / Bác sĩ / Bệnh nhân
- ✅ Dashboard cho từng vai trò
- ✅ Quản lý lịch hẹn
- ✅ Quản lý dịch vụ nha khoa
- ✅ Quản lý bác sĩ & bệnh nhân
- ✅ Kết quả khám
- ✅ AI Chatbot (RAG)
- ✅ Thông báo
