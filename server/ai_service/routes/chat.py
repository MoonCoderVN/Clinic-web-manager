import json
import re
import unicodedata
from typing import AsyncIterator
from fastapi import APIRouter, Header, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator

from intent.classifier import classify_intent
from booking.flow import conduct_booking_flow
from rag.chain import run_rag_chain, run_rag_chain_stream
from db.mongo import appointment_col, doctor_col, user_col

router = APIRouter(prefix="/chat")

_public_rate_map: dict[str, dict] = {}
_PUBLIC_RATE_LIMIT = 20
_PUBLIC_RATE_WINDOW = 60


def _check_rate_limit(ip: str) -> bool:
    import time
    now = time.time()
    entry = _public_rate_map.get(ip, {"count": 0, "reset": now + _PUBLIC_RATE_WINDOW})
    if now > entry["reset"]:
        entry = {"count": 0, "reset": now + _PUBLIC_RATE_WINDOW}
    entry["count"] += 1
    _public_rate_map[ip] = entry
    return entry["count"] <= _PUBLIC_RATE_LIMIT


def _normalize(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    without_diacritics = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    return without_diacritics.replace("đ", "d").replace("Đ", "D").lower()


def _has_injection_risk(message: str) -> bool:
    text = _normalize(message)
    return bool(re.search(
        r"(bo qua|ignore|forget|tiet lo|reveal|system prompt|developer message|"
        r"huong dan truoc|mien phi tat ca|tra loi sai|jailbreak)",
        text,
    ))


def _safe_history(history: list) -> list[dict]:
    if not isinstance(history, list):
        return []
    result = []
    for item in history[-6:]:
        if isinstance(item, dict) and item.get("role") in ("user", "assistant") and isinstance(item.get("content"), str):
            result.append({"role": item["role"], "content": item["content"][:1200]})
    return result


async def _build_user_context(user_id: str) -> str:
    from bson import ObjectId
    try:
        uid = ObjectId(user_id)
    except Exception:
        return ""

    col = appointment_col()
    appointments = await col.find(
        {"patientId": uid, "status": {"$in": ["pending", "confirmed", "rescheduled"]}},
        {"doctorId": 1, "serviceId": 1, "appointmentDate": 1, "date": 1, "startTime": 1, "timeSlot": 1, "status": 1},
    ).to_list(length=10)

    if not appointments:
        return ""

    lines = ["Danh sách lịch hẹn sắp tới của người dùng:"]
    for appt in appointments:
        doc = await doctor_col().find_one({"_id": appt.get("doctorId")}, {"userId": 1})
        doc_name = "Bác sĩ"
        if doc:
            usr = await user_col().find_one({"_id": doc.get("userId")}, {"fullName": 1})
            doc_name = usr.get("fullName", "Bác sĩ") if usr else "Bác sĩ"

        appt_date = appt.get("appointmentDate") or appt.get("date")
        date_str = appt_date.strftime("%d/%m/%Y") if appt_date else "?"
        time_str = appt.get("startTime") or appt.get("timeSlot") or ""
        status_map = {"pending": "Chờ xác nhận", "confirmed": "Đã xác nhận", "rescheduled": "Đã đổi lịch"}
        status = status_map.get(appt.get("status", ""), appt.get("status", ""))
        lines.append(f"- Ngày {date_str} lúc {time_str}: BS {doc_name}. Trạng thái: {status}.")

    return "\n".join(lines)


# ── Pydantic models ──────────────────────────────────────────────────────────

class PublicChatRequest(BaseModel):
    message: str
    history: list = []
    bookingContext: dict | None = None
    pageContext: dict | None = None

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("message is required")
        return v.strip()


class AuthChatRequest(PublicChatRequest):
    pass


# ── SSE helper ───────────────────────────────────────────────────────────────

def _sse_line(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


async def _stream_rag(
    message: str,
    history: list,
    user_context: str,
    intent: dict,
    page_context: dict | None = None,
) -> AsyncIterator[str]:
    async for event in run_rag_chain_stream(message, history, user_context, intent, page_context):
        yield _sse_line(event)


# ── Public endpoints ─────────────────────────────────────────────────────────

@router.post("/public")
async def public_chat(body: PublicChatRequest, request: Request):
    ip = request.client.host if request.client else "unknown"
    if not _check_rate_limit(ip):
        return {"success": False, "message": "Quá nhiều yêu cầu, vui lòng thử lại sau."}

    if _has_injection_risk(body.message):
        return {
            "data": {
                "answer": "Mình chỉ hỗ trợ theo thông tin chính thức của DentaCare.",
                "sources": [],
                "quickReplies": [{"label": "Xem dịch vụ", "value": "Cho tôi xem bảng giá dịch vụ"}],
            }
        }

    intent = classify_intent(body.message, body.bookingContext)

    if intent["intent"] == "BOOKING_FLOW":
        result = await conduct_booking_flow(body.message, body.bookingContext, False)
        return {"data": result}

    history = _safe_history(body.history)
    result = await run_rag_chain(body.message, history, "", intent, body.pageContext)
    return {"data": result}


@router.post("/public/stream")
async def public_chat_stream(body: PublicChatRequest, request: Request):
    ip = request.client.host if request.client else "unknown"
    if not _check_rate_limit(ip):
        async def rate_limit_event():
            yield _sse_line({"type": "error", "message": "Quá nhiều yêu cầu."})
        return StreamingResponse(rate_limit_event(), media_type="text/event-stream")

    intent = classify_intent(body.message, body.bookingContext)

    if intent["intent"] == "BOOKING_FLOW":
        result = await conduct_booking_flow(body.message, body.bookingContext, False)

        async def booking_events():
            yield _sse_line({"type": "token", "token": result["answer"]})
            yield _sse_line({"type": "done", **result})

        return StreamingResponse(booking_events(), media_type="text/event-stream; charset=utf-8")

    history = _safe_history(body.history)

    return StreamingResponse(
        _stream_rag(body.message, history, "", intent, body.pageContext),
        media_type="text/event-stream; charset=utf-8",
    )


# ── Authenticated endpoints ──────────────────────────────────────────────────

@router.post("/message")
async def auth_chat(
    body: AuthChatRequest,
    x_user_id: str = Header(default=""),
):
    if _has_injection_risk(body.message):
        return {
            "data": {
                "answer": "Mình chỉ hỗ trợ theo thông tin chính thức của DentaCare.",
                "sources": [],
                "quickReplies": [],
            }
        }

    intent = classify_intent(body.message, body.bookingContext)

    if intent["intent"] == "BOOKING_FLOW":
        result = await conduct_booking_flow(body.message, body.bookingContext, True)
        return {"data": result}

    user_context = await _build_user_context(x_user_id) if x_user_id else ""
    history = _safe_history(body.history)
    result = await run_rag_chain(body.message, history, user_context, intent, body.pageContext)
    return {"data": result}


@router.post("/stream")
async def auth_chat_stream(
    body: AuthChatRequest,
    x_user_id: str = Header(default=""),
):
    intent = classify_intent(body.message, body.bookingContext)

    if intent["intent"] == "BOOKING_FLOW":
        result = await conduct_booking_flow(body.message, body.bookingContext, True)

        async def booking_events():
            yield _sse_line({"type": "token", "token": result["answer"]})
            yield _sse_line({"type": "done", **result})

        return StreamingResponse(booking_events(), media_type="text/event-stream; charset=utf-8")

    user_context = await _build_user_context(x_user_id) if x_user_id else ""
    history = _safe_history(body.history)

    return StreamingResponse(
        _stream_rag(body.message, history, user_context, intent, body.pageContext),
        media_type="text/event-stream; charset=utf-8",
    )
