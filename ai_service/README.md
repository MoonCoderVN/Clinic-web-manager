# DentaCare AI Service

Python FastAPI microservice xử lý RAG và booking wizard cho chatbot DentaCare.

## Cài đặt

```bash
cd ai_service

# Tạo virtual environment
python -m venv venv

# Kích hoạt (Windows)
venv\Scripts\activate

# Cài dependencies
pip install -r requirements.txt
```

## Cấu hình

Sao chép `.env.example` thành `.env` và điền thông tin:

```bash
copy .env.example .env
```

**Lưu ý:** Dùng cùng `MONGODB_URI` và `GEMINI_API_KEY` với `server/.env`.

## Chạy

```bash
# Development (auto-reload)
uvicorn main:app --reload --port 8000

# Hoặc
python main.py
```

Service chạy tại: `http://localhost:8000`  
API docs: `http://localhost:8000/docs`

## Kết nối với Node.js

Thêm vào `server/.env`:
```
AI_SERVICE_URL=http://localhost:8000
```

Khi `AI_SERVICE_URL` được set, Node.js tự động proxy chat requests sang Python service.  
Khi Python service down, Node.js fallback về controller cũ.

## API Endpoints

| Method | Path | Mô tả |
|--------|------|--------|
| POST | /chat/public | Chat công khai (không cần auth) |
| POST | /chat/public/stream | Chat stream SSE công khai |
| POST | /chat/message | Chat xác thực (cần header X-User-Id) |
| POST | /chat/stream | Chat stream SSE xác thực |
| GET | /health | Health check |
