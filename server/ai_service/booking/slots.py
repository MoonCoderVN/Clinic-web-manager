from datetime import datetime, date, timedelta
from bson import ObjectId
from db.mongo import doctor_col, service_col, schedule_col, appointment_col, leave_request_col, user_col


def _time_to_minutes(time_str: str) -> int | None:
    try:
        parts = time_str.split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except Exception:
        return None


def _minutes_to_time(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def _get_monday(d: date) -> str:
    monday = d - timedelta(days=d.weekday())
    return monday.strftime("%Y-%m-%d")


async def _is_doctor_off(doctor_user_id, date_str: str) -> bool:
    col = leave_request_col()
    y, m, day = map(int, date_str.split("-"))
    date_start = datetime(y, m, day, 0, 0, 0)
    date_end = datetime(y, m, day, 23, 59, 59)
    result = await col.find_one({
        "doctor_id": doctor_user_id,
        "date_off": {"$gte": date_start, "$lte": date_end},
        "status": "approved",
    })
    return result is not None


async def get_available_slots_for_booking(date_str: str, service_id: str, doctor_id: str | None = None) -> list[dict]:
    y, m, d = map(int, date_str.split("-"))
    target_date = date(y, m, d)
    today = date.today()
    if target_date < today:
        return []

    day_of_week = target_date.weekday()  # Monday=0 ... Sunday=6
    # JS uses 0=Sunday, so convert: JS dayOfWeek = (Python weekday + 1) % 7
    js_day_of_week = (day_of_week + 1) % 7
    week_start = _get_monday(target_date)

    col_svc = service_col()
    try:
        svc_id = ObjectId(service_id)
    except Exception:
        return []
    service = await col_svc.find_one({"_id": svc_id, "isActive": True, "isDeleted": {"$ne": True}})
    if not service:
        return []
    duration = service.get("duration") or 30

    col_doc = doctor_col()
    col_usr = user_col()
    col_sch = schedule_col()
    col_appt = appointment_col()

    doctor_filter: dict = {"services": svc_id}
    if doctor_id:
        try:
            doctor_filter["_id"] = ObjectId(doctor_id)
        except Exception:
            pass
    doctors = await col_doc.find(doctor_filter).to_list(length=100)
    result = []

    day_start = datetime(y, m, d, 0, 0, 0)
    day_end = datetime(y, m, d, 23, 59, 59)
    now = datetime.now()
    is_today = target_date == today
    min_start_minutes = now.hour * 60 + now.minute if is_today else 0

    for doctor in doctors:
        user_ref = doctor.get("userId")
        if not user_ref:
            continue
        user = await col_usr.find_one({"_id": user_ref}, {"fullName": 1, "isActive": 1})
        if not user or user.get("isActive") is False:
            continue
        doctor_user_id = user_ref

        # Get schedule
        schedule = await col_sch.find_one({"doctorId": doctor_user_id, "dayOfWeek": js_day_of_week, "weekStart": week_start})
        if not schedule:
            schedule = await col_sch.find_one({"doctorId": doctor_user_id, "dayOfWeek": js_day_of_week, "weekStart": None})
        if not schedule or schedule.get("isOff") or not schedule.get("startTime") or not schedule.get("endTime"):
            continue

        # Check leave
        if await _is_doctor_off(doctor_user_id, date_str):
            continue

        # Get booked appointments
        booked = await col_appt.find(
            {
                "doctorId": doctor["_id"],
                "$or": [
                    {"appointmentDate": {"$gte": day_start, "$lte": day_end}},
                    {"date": {"$gte": day_start, "$lte": day_end}},
                ],
                "status": {"$nin": ["cancelled"]},
            },
            {"startTime": 1, "endTime": 1, "timeSlot": 1},
        ).to_list(length=200)

        work_start = _time_to_minutes(schedule["startTime"])
        work_end = _time_to_minutes(schedule["endTime"])
        if work_start is None or work_end is None or work_end <= work_start:
            continue

        occupied = []
        for appt in booked:
            s = _time_to_minutes(appt.get("startTime") or appt.get("timeSlot") or "")
            if s is None:
                continue
            e_str = appt.get("endTime")
            e = _time_to_minutes(e_str) if e_str else s + duration
            occupied.append((s, e))

        doctor_name = user.get("fullName", "Bác sĩ")
        doctor_id = str(doctor["_id"])

        cursor = work_start
        while cursor + duration <= work_end:
            if cursor >= min_start_minutes:
                slot_end = cursor + duration
                conflict = any(cursor < e and slot_end > s for s, e in occupied)
                if not conflict:
                    result.append({
                        "doctorId": doctor_id,
                        "doctorName": doctor_name,
                        "time": _minutes_to_time(cursor),
                    })
            cursor += duration

    result.sort(key=lambda x: x["time"])
    return result


def filter_slots_by_time_period(slots: list[dict], time_period: str) -> list[dict]:
    if not time_period:
        return slots
    ranges = {
        "morning": (7 * 60, 12 * 60),
        "afternoon": (12 * 60, 17 * 60 + 30),
        "evening": (17 * 60 + 30, 21 * 60),
    }
    r = ranges.get(time_period)
    if not r:
        return slots
    return [s for s in slots if r[0] <= _time_to_minutes(s["time"]) < r[1]]
