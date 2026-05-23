import re
import time
import unicodedata
from typing import AsyncIterator
import google.generativeai as genai
from config import settings
from rag.retriever import hybrid_retrieve
from rag.prompts import build_prompt
from db.mongo import service_col, doctor_col, settings_col

_clinic_cache: dict = {"data": None, "ts": 0}
_CLINIC_CACHE_TTL = 300


def _normalize(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    without_diacritics = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    return without_diacritics.replace("đ", "d").replace("Đ", "D").lower()


async def _build_clinic_context() -> str:
    global _clinic_cache
    now = time.monotonic()
    if _clinic_cache["data"] is not None and (now - _clinic_cache["ts"]) < _CLINIC_CACHE_TTL:
        return _clinic_cache["data"]

    col = settings_col()
    clinic = await col.find_one({"singleton": "clinic"})
    if not clinic:
        _clinic_cache = {"data": "", "ts": now}
        return ""

    lines = ["Thông tin phòng khám DentaCare:"]
    if clinic.get("clinicName"):
        lines.append(f"- Tên phòng khám: {clinic['clinicName']}")
    if clinic.get("address"):
        lines.append(f"- Địa chỉ: {clinic['address']}")
    if clinic.get("phone"):
        lines.append(f"- Số điện thoại: {clinic['phone']}")
    if clinic.get("email"):
        lines.append(f"- Email liên hệ: {clinic['email']}")
    if clinic.get("openTime") and clinic.get("closeTime"):
        lines.append(f"- Giờ làm việc: {clinic['openTime']} - {clinic['closeTime']}")
    if clinic.get("workDays"):
        lines.append(f"- Ngày làm việc: {clinic['workDays']}")
    if clinic.get("description"):
        lines.append(f"- Giới thiệu: {clinic['description']}")

    result = "\n".join(lines) if len(lines) > 1 else ""
    _clinic_cache = {"data": result, "ts": now}
    return result


async def _build_page_context_hint(page_context: dict | None) -> str:
    if not page_context:
        return ""
    from bson import ObjectId
    page = page_context.get("page", "")
    entity_type = page_context.get("entityType", "")
    entity_id = page_context.get("entityId", "")

    if page == "doctor_detail" and entity_type == "doctor" and entity_id:
        try:
            col = doctor_col()
            pipeline = [
                {"$match": {"_id": ObjectId(entity_id)}},
                {"$lookup": {"from": "users", "localField": "userId", "foreignField": "_id", "as": "userInfo"}},
                {"$unwind": "$userInfo"},
                {"$lookup": {"from": "services", "localField": "services", "foreignField": "_id", "as": "serviceInfo"}},
            ]
            docs = await col.aggregate(pipeline).to_list(length=1)
            if docs:
                d = docs[0]
                name = d.get("userInfo", {}).get("fullName", "Bác sĩ")
                spec = d.get("specialization", "")
                exp = f" Kinh nghiệm: {d['experience']} năm." if isinstance(d.get("experience"), (int, float)) else ""
                rating = f" Đánh giá: {d['rating']}/5." if isinstance(d.get("rating"), (int, float)) else ""
                svcs = ", ".join(s["name"] for s in d.get("serviceInfo", []) if s.get("name"))
                svc_str = f" Dịch vụ: {svcs}." if svcs else ""
                return (
                    f"[Ngữ cảnh trang]: Người dùng đang xem hồ sơ BS {name} ({spec}).{exp}{rating}{svc_str}\n"
                    f"Ưu tiên trả lời câu hỏi liên quan đến bác sĩ này."
                )
        except Exception as e:
            print(f"[chain] _build_page_context_hint error: {e}")

    hints = {
        "home": "Người dùng đang ở trang chủ phòng khám.",
        "services_list": "Người dùng đang xem danh sách dịch vụ nha khoa.",
        "doctors_list": "Người dùng đang xem danh sách đội ngũ bác sĩ.",
        "booking": "Người dùng đang ở trang đặt lịch khám — ưu tiên hỗ trợ đặt lịch.",
        "appointments": "Người dùng đang xem quản lý lịch hẹn của mình.",
        "history": "Người dùng đang xem lịch sử khám bệnh — hỗ trợ giải thích kết quả nếu cần.",
        "ai_chat": "Người dùng đang dùng tính năng tư vấn AI chuyên sâu — có thể trả lời chi tiết hơn.",
        "patient_dashboard": "Người dùng đang ở trang tổng quan bệnh nhân.",
    }
    hint = hints.get(page, "")
    return f"[Ngữ cảnh trang]: {hint}" if hint else ""


async def _build_service_context() -> str:
    col = service_col()
    services = await col.find(
        {"isActive": True, "isDeleted": {"$ne": True}},
        {"name": 1, "description": 1, "price": 1, "duration": 1, "category": 1},
    ).sort([("category", 1), ("name", 1)]).limit(30).to_list(length=30)

    if not services:
        return ""

    lines = ["Dữ liệu hệ thống về dịch vụ và bảng giá DentaCare:"]
    for s in services:
        price = f"{int(s['price']):,} VND".replace(",", ".") if isinstance(s.get("price"), (int, float)) else "Liên hệ"
        duration = f" Thời lượng: {s['duration']} phút." if s.get("duration") else ""
        desc = f" {s['description']}" if s.get("description") else ""
        lines.append(f"- {s['name']}: {price}.{duration}{desc}")
    return "\n".join(lines)


async def _build_doctor_context(message: str) -> str:
    col = doctor_col()
    pipeline = [
        {"$lookup": {"from": "users", "localField": "userId", "foreignField": "_id", "as": "userInfo"}},
        {"$unwind": "$userInfo"},
        {"$lookup": {"from": "services", "localField": "services", "foreignField": "_id", "as": "serviceInfo"}},
        {"$limit": 10},
    ]
    doctors = await col.aggregate(pipeline).to_list(length=10)
    if not doctors:
        return ""

    text = _normalize(message)
    matched = [
        d for d in doctors
        if any(
            part and len(part) >= 3 and part in text
            for part in _normalize(d.get("userInfo", {}).get("fullName", "")).split()
        )
    ]
    display = matched or doctors[:8]

    lines = ["Dữ liệu hệ thống về bác sĩ DentaCare:"]
    for d in display:
        name = d.get("userInfo", {}).get("fullName", "Bác sĩ")
        spec = d.get("specialization", "Chuyên khoa nha khoa")
        exp = f" Kinh nghiệm: {d['experience']} năm." if isinstance(d.get("experience"), (int, float)) else ""
        rating = f" Đánh giá: {d['rating']}/5." if isinstance(d.get("rating"), (int, float)) else ""
        svcs = ", ".join(s["name"] for s in d.get("serviceInfo", []) if s.get("name"))
        svc_str = f" Dịch vụ: {svcs}." if svcs else ""
        lines.append(f"- {name}: {spec}.{exp}{rating}{svc_str}")
    return "\n".join(lines)


async def _build_runtime_context(message: str, intent: dict, page_context: dict | None = None) -> str:
    text = _normalize(message)
    sections = []

    clinic_ctx = await _build_clinic_context()
    if clinic_ctx:
        sections.append(clinic_ctx)

    page_hint = await _build_page_context_hint(page_context)
    if page_hint:
        sections.append(page_hint)

    needs_service = (
        intent.get("wantsServiceInfo")
        or bool(re.search(r"dich vu|gia|chi phi|bao nhieu|nieng|implant|tay trang|tram|nho rang|rang su|phuc hinh", text))
    )
    needs_doctor = (
        intent.get("wantsDoctorInfo")
        or bool(re.search(r"bac si|bs|nha si", text))
    )

    if needs_service:
        ctx = await _build_service_context()
        if ctx:
            sections.append(ctx)
    if needs_doctor:
        ctx = await _build_doctor_context(message)
        if ctx:
            sections.append(ctx)

    return "\n\n".join(sections)


def _build_quick_replies(query: str) -> list[dict]:
    text = query.lower()
    if re.search(r"lich|dat|hen|slot|bac si|bs", text):
        return [
            {"label": "Tư vấn dịch vụ", "value": "Tư vấn giúp tôi nên chọn dịch vụ nha khoa nào"},
            {"label": "Xem bảng giá", "value": "Cho tôi xem bảng giá dịch vụ"},
            {"label": "Tư vấn thêm", "value": "Tôi muốn được tư vấn thêm thông tin"},
        ]
    if re.search(r"gia|chi phi|implant|nieng|e-max|emax", text):
        return [
            {"label": "Tư vấn dịch vụ", "value": "Tư vấn thêm về dịch vụ này"},
            {"label": "Xem bảng giá", "value": "Cho tôi xem bảng giá dịch vụ"},
            {"label": "Hỏi bảo hành", "value": "Dịch vụ này có bảo hành không?"},
        ]
    return [
        {"label": "Tư vấn dịch vụ", "value": "Tư vấn giúp tôi nên chọn dịch vụ nha khoa nào"},
        {"label": "Xem bảng giá", "value": "Cho tôi xem bảng giá dịch vụ"},
        {"label": "Tư vấn thêm", "value": "Tôi cần tư vấn thêm thông tin"},
    ]


def _get_llm():
    keys = settings.gemini_keys()
    if not keys:
        raise ValueError("No GEMINI_API_KEY configured")
    genai.configure(api_key=keys[0])
    models = settings.gemini_models()
    return genai.GenerativeModel(models[0] if models else "gemini-2.5-flash")


async def run_rag_chain(
    query: str,
    history: list[dict],
    user_context: str = "",
    intent: dict | None = None,
    page_context: dict | None = None,
) -> dict:
    if not settings.gemini_keys():
        return {
            "answer": "Chatbot chưa được cấu hình. Vui lòng thêm GEMINI_API_KEY vào file .env",
            "sources": [],
            "quickReplies": [],
        }

    try:
        docs = await hybrid_retrieve(query)
        kb_context = "\n\n---\n\n".join(d["content"] for d in docs)
        sources = [d["metadata"] for d in docs[:3]]

        runtime_ctx = await _build_runtime_context(query, intent or {}, page_context)
        combined_context = "\n\n".join(filter(None, [user_context, runtime_ctx]))

        prompt = build_prompt(query, history, kb_context, combined_context)
        model = _get_llm()
        response = model.generate_content(prompt)
        answer = response.text

        return {
            "answer": answer,
            "sources": sources,
            "quickReplies": _build_quick_replies(query),
            "uiState": "done",
        }
    except Exception as e:
        print(f"[RAG] Error: {e}")
        return {
            "answer": "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Bạn có thể liên hệ trực tiếp với phòng khám.",
            "sources": [],
            "quickReplies": _build_quick_replies(query),
            "uiState": "done",
        }


async def run_rag_chain_stream(
    query: str,
    history: list[dict],
    user_context: str = "",
    intent: dict | None = None,
    page_context: dict | None = None,
) -> AsyncIterator[dict]:
    if not settings.gemini_keys():
        yield {"type": "token", "token": "Chatbot chưa được cấu hình. Vui lòng thêm GEMINI_API_KEY."}
        yield {"type": "done", "answer": "Chatbot chưa được cấu hình.", "sources": [], "quickReplies": []}
        return

    try:
        yield {"type": "state", "uiState": "retrieving"}
        docs = await hybrid_retrieve(query)
        sources = [d["metadata"] for d in docs[:3]]
        yield {"type": "sources", "sources": sources}

        kb_context = "\n\n---\n\n".join(d["content"] for d in docs)
        runtime_ctx = await _build_runtime_context(query, intent or {}, page_context)
        combined_context = "\n\n".join(filter(None, [user_context, runtime_ctx]))

        prompt = build_prompt(query, history, kb_context, combined_context)
        yield {"type": "state", "uiState": "generating"}

        model = _get_llm()
        full_answer = ""
        for chunk in model.generate_content(prompt, stream=True):
            token = chunk.text or ""
            if token:
                full_answer += token
                yield {"type": "token", "token": token}

        yield {
            "type": "done",
            "answer": full_answer,
            "sources": sources,
            "quickReplies": _build_quick_replies(query),
            "uiState": "done",
        }

    except Exception as e:
        print(f"[RAG Stream] Error: {e}")
        error_msg = "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Bạn có thể liên hệ trực tiếp với phòng khám."
        yield {"type": "token", "token": error_msg}
        yield {"type": "done", "answer": error_msg, "sources": [], "quickReplies": []}
