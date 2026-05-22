import re
import unicodedata
from datetime import date, timedelta
from urllib.parse import quote
from db.mongo import service_col
from booking.slots import get_available_slots_for_booking

_DATE_PAGE_SIZE = 5
_DATE_MAX_PAGE = 3


def _normalize(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    without_diacritics = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    return without_diacritics.replace("đ", "d").replace("Đ", "D").lower()


def _has_cancel_signal(text: str) -> bool:
    return bool(re.match(r"^(huy|thoi|bo qua|khong muon dat|thoat|exit|cancel|quay lai)", text))


def _get_today() -> date:
    return date.today()


def _format_date_vn(date_str: str) -> str:
    y, m, d = map(int, date_str.split("-"))
    d_obj = date(y, m, d)
    weekday_names = ["Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy", "Chủ nhật"]
    weekday = weekday_names[d_obj.weekday()]
    return f"{weekday}, {d:02d}/{m:02d}/{y}"


def _parse_date_from_text(text: str) -> str | None:
    today = _get_today()
    m = re.search(r"\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?\b", text)
    if m:
        try:
            d_val = date(int(m.group(3) or today.year), int(m.group(2)), int(m.group(1)))
            if d_val >= today:
                return d_val.strftime("%Y-%m-%d")
        except ValueError:
            pass
    weekday_map = [
        (["chu nhat", "cn"], 6),
        (["thu hai", "thu 2", "t2"], 0),
        (["thu ba", "thu 3", "t3"], 1),
        (["thu tu", "thu 4", "t4"], 2),
        (["thu nam", "thu 5", "t5"], 3),
        (["thu sau", "thu 6", "t6"], 4),
        (["thu bay", "thu 7", "t7"], 5),
    ]
    is_next_week = "tuan sau" in text or "tuan toi" in text
    for keywords, wd in weekday_map:
        if any(kw in text for kw in keywords):
            if is_next_week:
                this_monday = today - timedelta(days=today.weekday())
                next_monday = this_monday + timedelta(days=7)
                return (next_monday + timedelta(days=wd)).strftime("%Y-%m-%d")
            diff = (wd - today.weekday()) % 7 or 7
            return (today + timedelta(days=diff)).strftime("%Y-%m-%d")
    return None


def _parse_time_from_text(text: str) -> str | None:
    # Thử format HH:MM trước (vd: 14:00, 9:30)
    m = re.search(r"\b(\d{1,2}):(\d{2})\b", text)
    if m:
        h, mn = int(m.group(1)), int(m.group(2))
        if 0 <= h <= 23:
            return f"{h:02d}:{mn:02d}"
    # Thử "Xh[MM]" hoặc "X giờ [MM]" — có thể có space trước h/gio
    m = re.search(r"\b(\d{1,2})\s*(?:h|gio)\s*(\d{0,2})", text)
    if m:
        h = int(m.group(1))
        mn = int(m.group(2) or 0)
        # Quy đổi chiều/tối → +12 giờ (chieu/toi sau khi normalize)
        if re.search(r"\b(chieu|toi)\b", text) and h < 12:
            h += 12
        if 0 <= h <= 23:
            return f"{h:02d}:{mn:02d}"
    return None


def _match_slot_from_text(text: str, slots: list) -> dict | None:
    time_hint = _parse_time_from_text(text)
    name_parts = [p for p in text.split() if len(p) >= 3]
    filtered = slots
    if time_hint:
        filtered = [s for s in filtered if s["time"] == time_hint]
    if name_parts:
        name_filtered = [
            s for s in filtered
            if any(p in _normalize(s["doctorName"]) for p in name_parts)
        ]
        if name_filtered:
            filtered = name_filtered
    return filtered[0] if len(filtered) == 1 else None


def _match_service_from_text(text: str, services: list) -> dict | None:
    matched = [
        s for s in services
        if any(len(p) >= 3 and p in text for p in _normalize(s["name"]).split())
    ]
    return matched[0] if len(matched) == 1 else None


def _generate_date_options(page: int = 0) -> list[dict]:
    today = _get_today()
    day_names = ["Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy", "Chủ nhật"]
    start = page * _DATE_PAGE_SIZE
    options = []
    for i in range(_DATE_PAGE_SIZE):
        d = today + timedelta(days=start + i)
        if d == today:
            label = "Hôm nay"
        elif d == today + timedelta(days=1):
            label = "Ngày mai"
        else:
            label = day_names[d.weekday()]
        short = d.strftime("%d/%m")
        options.append({
            "label": f"{label} ({short})",
            "value": f"{label} ({short})",
            "bookingData": {"date": d.strftime("%Y-%m-%d"), "step": "time_select"},
        })
    if page < _DATE_MAX_PAGE:
        options.append({
            "label": "Xem thêm ngày →",
            "value": "Xem thêm ngày",
            "bookingData": {"datePage": page + 1, "step": "date_select"},
        })
    if page > 0:
        options.append({
            "label": "← Trở về",
            "value": "Trở về",
            "bookingData": {"datePage": page - 1, "step": "date_select"},
        })
    return options


async def conduct_booking_flow(message: str, ctx: dict | None, is_authenticated: bool) -> dict:
    ctx = ctx or {}
    text = _normalize(message or "")

    # Allow cancel mid-flow
    if ctx.get("step") and ctx.get("step") != "confirm" and _has_cancel_signal(text):
        return {
            "answer": "Đã hủy đặt lịch. Bạn cần hỗ trợ thêm điều gì không?",
            "sources": [],
            "uiState": "done",
            "quickReplies": [
                {"label": "Đặt lịch khám", "value": "Tôi muốn đặt lịch"},
                {"label": "Xem dịch vụ", "value": "Cho tôi xem bảng giá dịch vụ"},
            ],
            "bookingAssist": None,
        }

    # Step 1: No service selected
    if not ctx.get("serviceId"):
        col = service_col()
        services = await col.find(
            {"isActive": True, "isDeleted": {"$ne": True}},
            {"_id": 1, "name": 1},
        ).sort("name", 1).limit(12).to_list(length=12)

        matched_svc = _match_service_from_text(text, services)
        if matched_svc:
            ctx = {**ctx, "serviceId": str(matched_svc["_id"]), "serviceName": matched_svc["name"]}
        else:
            return {
                "answer": "Bạn muốn đặt lịch cho dịch vụ nào? Vui lòng chọn một dịch vụ bên dưới:",
                "sources": [],
                "uiState": "done",
                "quickReplies": [
                    {
                        "label": s["name"],
                        "value": s["name"],
                        "bookingData": {"serviceId": str(s["_id"]), "serviceName": s["name"], "step": "date_select"},
                    }
                    for s in services
                ],
                "bookingAssist": {"step": "service_select"},
            }

    # Step 2: No date selected
    if not ctx.get("date"):
        parsed_date = _parse_date_from_text(text)
        if parsed_date:
            ctx = {**ctx, "date": parsed_date}
        else:
            page = ctx.get("datePage") or 0
            return {
                "answer": (
                    f"Dịch vụ **{ctx.get('serviceName', '')}** đã được chọn. "
                    "Bạn muốn đặt khám vào ngày nào?\n_Hoặc gõ ngày cụ thể (vd: 28/05, thứ 2 tuần sau)_"
                ),
                "sources": [],
                "uiState": "done",
                "quickReplies": _generate_date_options(page),
                "bookingAssist": {"step": "date_select", **ctx},
            }

    # Step 3: No time selected — show available time slots
    if not ctx.get("startTime"):
        all_slots = await get_available_slots_for_booking(ctx["date"], ctx["serviceId"])

        if not all_slots:
            return {
                "answer": (
                    f"Rất tiếc, không có lịch trống nào cho dịch vụ **{ctx.get('serviceName', '')}** "
                    f"vào **{_format_date_vn(ctx['date'])}**. Bạn muốn chọn ngày khác không?"
                ),
                "sources": [],
                "uiState": "done",
                "quickReplies": [
                    {"label": "Chọn ngày khác", "value": "Chọn ngày khác", "bookingData": {"date": None, "step": "date_select"}},
                    {"label": "Bắt đầu lại", "value": "Tôi muốn đặt lịch", "bookingData": {"reset": True}},
                ],
                "bookingAssist": {"step": "time_select", **ctx},
            }

        # Deduplicate times while preserving order
        seen: set[str] = set()
        unique_times: list[str] = []
        for s in all_slots:
            if s["time"] not in seen:
                seen.add(s["time"])
                unique_times.append(s["time"])

        # Free-text: user typed a time like "8h"
        time_hint = _parse_time_from_text(text)
        if time_hint and time_hint in seen:
            ctx = {**ctx, "startTime": time_hint}
        else:
            quick_replies = [
                {
                    "label": t,
                    "value": t,
                    "bookingData": {"startTime": t, "step": "doctor_select"},
                }
                for t in unique_times[:12]
            ]
            return {
                "answer": (
                    f"Chọn giờ khám vào **{_format_date_vn(ctx['date'])}**:\n"
                    "_Hoặc gõ giờ cụ thể (vd: 8h, 14:30)_"
                ),
                "sources": [],
                "uiState": "done",
                "quickReplies": quick_replies,
                "bookingAssist": {"step": "time_select", **ctx},
            }

    # Step 4: No doctor selected — filter by chosen time, show doctors
    if not ctx.get("doctorId"):
        all_slots = await get_available_slots_for_booking(ctx["date"], ctx["serviceId"])
        time_slots = [s for s in all_slots if s["time"] == ctx["startTime"]]

        if not time_slots:
            return {
                "answer": (
                    f"Rất tiếc, không còn lịch trống lúc **{ctx['startTime']}** "
                    f"ngày **{_format_date_vn(ctx['date'])}**. Bạn muốn chọn giờ khác không?"
                ),
                "sources": [],
                "uiState": "done",
                "quickReplies": [
                    {"label": "Chọn giờ khác", "value": "Chọn giờ khác", "bookingData": {"startTime": None, "step": "time_select"}},
                    {"label": "Bắt đầu lại", "value": "Tôi muốn đặt lịch", "bookingData": {"reset": True}},
                ],
                "bookingAssist": {"step": "doctor_select", **ctx},
            }

        matched_slot = _match_slot_from_text(text, time_slots)
        if matched_slot:
            ctx = {**ctx, "doctorId": matched_slot["doctorId"], "doctorName": matched_slot["doctorName"]}
        else:
            quick_replies: list[dict] = [
                {
                    "label": f"BS. {s['doctorName']}",
                    "value": f"BS. {s['doctorName']}",
                    "bookingData": {
                        "doctorId": s["doctorId"],
                        "doctorName": s["doctorName"],
                        "step": "confirm",
                    },
                }
                for s in time_slots
            ]
            return {
                "answer": f"Chọn bác sĩ khám lúc **{ctx['startTime']}** ngày **{_format_date_vn(ctx['date'])}**:",
                "sources": [],
                "uiState": "done",
                "quickReplies": quick_replies,
                "bookingAssist": {"step": "doctor_select", **ctx},
            }

    # Step 5: Confirm booking
    login_url = f"/auth/login?returnUrl={quote('/patient/appointments', safe='')}"

    answer_lines = [
        "**Tóm tắt lịch hẹn:**",
        f"- Dịch vụ: **{ctx.get('serviceName', '')}**",
        f"- Bác sĩ: **BS. {ctx.get('doctorName', '')}**",
        f"- Ngày: **{_format_date_vn(ctx['date'])}**",
        f"- Giờ: **{ctx.get('startTime', '')}**",
        "",
        'Nhấn **"Xác nhận đặt lịch"** để hoàn tất.' if is_authenticated else "Vui lòng đăng nhập để tiến hành đặt lịch.",
    ]

    return {
        "answer": "\n".join(answer_lines),
        "sources": [],
        "uiState": "done",
        "quickReplies": [
            (
                {"label": "Xác nhận đặt lịch", "value": "Xác nhận", "action": "create_booking"}
                if is_authenticated
                else {"label": "Đăng nhập để đặt lịch", "value": "Đăng nhập", "url": login_url}
            ),
            {"label": "Bắt đầu lại", "value": "Tôi muốn đặt lịch", "bookingData": {"reset": True}},
        ],
        "bookingAssist": {"step": "confirm", **ctx},
    }
