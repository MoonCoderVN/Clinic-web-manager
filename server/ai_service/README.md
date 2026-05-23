# DentaCare AI Service

FastAPI service for chatbot RAG and booking flow. It is colocated inside the Node backend and is started automatically by `server/src/index.js`.

## Normal Run

From `server/`:

```powershell
npm run start
```

The Node backend starts:

- Express API on `PORT` from `server/.env`
- FastAPI AI service on `AI_SERVICE_HOST:AI_SERVICE_PORT`

Default AI URL:

```text
http://127.0.0.1:8000
```

## First-Time Setup

From `server/`:

```powershell
python -m venv ai_service\venv
ai_service\venv\Scripts\python.exe -m pip install -r ai_service\requirements.txt
```

The Node launcher looks for Python in this order:

1. `AI_SERVICE_PYTHON_PATH`
2. `server/ai_service/venv/Scripts/python.exe`
3. `server/ai_service/.venv/Scripts/python.exe`
4. `python` from PATH

## Env

Configure in `server/.env`:

```text
AI_SERVICE_ENABLED=true
AI_SERVICE_REQUIRED=false
AI_SERVICE_HOST=127.0.0.1
AI_SERVICE_PORT=8000
AI_SERVICE_URL=http://127.0.0.1:8000
AI_SERVICE_RELOAD=false
AI_SERVICE_PROXY_CHAT=true
AI_SERVICE_PROXY_TIMEOUT_MS=30000
```

The AI service receives the same `MONGODB_URI`, `GEMINI_API_KEY`, and RAG settings from the Node process environment.

## Endpoints

```text
GET  /health
POST /chat/public
POST /chat/public/stream
POST /chat/message
POST /chat/stream
```

Express proxies `/api/chat/*` to these FastAPI endpoints when `AI_SERVICE_PROXY_CHAT=true`. If FastAPI is unavailable, Express falls back to the existing Node chat controller.
