import re
import unicodedata


def normalize(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    without_diacritics = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    return without_diacritics.replace("đ", "d").replace("Đ", "D").lower()


def _has_booking_flow_signal(text: str) -> bool:
    return bool(re.search(
        r"(muon dat|muon hen|cho toi dat|can dat lich|dat lich kham|ho tro dat|"
        r"tu van dat lich|dang ky kham|dang ky lich|can kham|giup toi dat|"
        r"huong dan dat|bat dau dat|toi muon dat|minh muon dat|muon kham)",
        text,
    ))


def _has_booking_action_signal(text: str) -> bool:
    return bool(re.search(
        r"(dat lich|dat hen|kiem tra lich|check lich|xem lich|con cho|con slot|"
        r"con lich|trong lich|lich trong|slot trong|con trong)",
        text,
    ))


def _has_doctor_info_signal(text: str) -> bool:
    return bool(re.search(
        r"(co bac si nao|danh sach bac si|doi ngu bac si|bac si nao|thong tin bac si|"
        r"bac si.*khong|bs.*khong)",
        text,
    ))


def _has_service_info_signal(text: str) -> bool:
    return bool(re.search(
        r"(bang gia|gia dich vu|dich vu|chi phi|nieng rang|implant|e-max|emax|"
        r"tay trang|nho rang|tram rang|boc rang|phuc hinh|rang su|loai dich vu|"
        r"kham tong quat|bao nhieu|mat bao nhieu|gia ca)",
        text,
    ))


def _has_relative_date_signal(text: str) -> bool:
    return bool(re.search(
        r"(hom nay|ngay mai|sang mai|chieu mai|toi mai|mai|tuan toi|"
        r"thu 2|thu hai|thu 3|thu ba|thu 4|thu tu|thu 5|thu nam|"
        r"thu 6|thu sau|thu 7|thu bay|chu nhat|cn|t2|t3|t4|t5|t6|t7|\b\d{1,2}[/-]\d{1,2})",
        text,
    ))


def _has_time_period_signal(text: str) -> bool:
    return bool(re.search(r"(sang|buoi sang|chieu|buoi chieu|toi|buoi toi|morning|afternoon|evening)", text))


def _has_clinic_info_signal(text: str) -> bool:
    return bool(re.search(
        r"(dia chi|so dien thoai|lien he|gio lam viec|gio mo cua|gio dong cua|"
        r"mo cua luc|dong cua luc|ngay lam viec|thu may|lam viec thu|"
        r"o dau|nam o dau|phong kham o|phong kham dau|"
        r"email|hotline|duong day nong|website|fanpage)",
        text,
    ))


def _has_doctor_name_hint(text: str, message: str) -> bool:
    match = re.search(r"\b(?:bac si|bs)\s+[a-zA-ZÀ-ỹ]{2,}", message, re.IGNORECASE)
    has_list_signal = bool(re.search(r"(bac si nao|danh sach bac si|doi ngu bac si)", text))
    return bool(match) and not has_list_signal


def classify_intent(message: str, booking_context: dict | None = None) -> dict:
    text = normalize(message)

    # In-progress booking flow — continue wizard
    if booking_context and booking_context.get("step"):
        return {
            "intent": "BOOKING_FLOW",
            "wantsDoctorInfo": False,
            "wantsServiceInfo": False,
            "wantsClinicInfo": False,
            "bookingAction": True,
            "hasSpecificEntities": False,
        }

    wants_doctor_info = _has_doctor_info_signal(text)
    wants_service_info = _has_service_info_signal(text)
    wants_clinic_info = _has_clinic_info_signal(text)
    booking_action = _has_booking_action_signal(text)
    specific_date = _has_relative_date_signal(text)
    specific_period = _has_time_period_signal(text)
    doctor_name_hint = _has_doctor_name_hint(text, message)
    has_specific_entities = specific_date or specific_period or doctor_name_hint

    # Explicit booking wizard start
    if _has_booking_flow_signal(text) and not doctor_name_hint and not specific_date:
        return {
            "intent": "BOOKING_FLOW",
            "wantsDoctorInfo": wants_doctor_info,
            "wantsServiceInfo": wants_service_info,
            "wantsClinicInfo": wants_clinic_info,
            "bookingAction": True,
            "hasSpecificEntities": False,
        }

    # Generic booking action without specific entities → wizard
    if booking_action and not has_specific_entities and not doctor_name_hint:
        return {
            "intent": "BOOKING_FLOW",
            "wantsDoctorInfo": wants_doctor_info,
            "wantsServiceInfo": wants_service_info,
            "wantsClinicInfo": wants_clinic_info,
            "bookingAction": True,
            "hasSpecificEntities": False,
        }

    if booking_action and has_specific_entities and (wants_doctor_info or wants_service_info):
        return {"intent": "MIXED", "wantsDoctorInfo": wants_doctor_info, "wantsServiceInfo": wants_service_info, "wantsClinicInfo": wants_clinic_info, "bookingAction": booking_action, "hasSpecificEntities": has_specific_entities}

    if booking_action and has_specific_entities:
        return {"intent": "BOOKING_CHECK", "wantsDoctorInfo": wants_doctor_info, "wantsServiceInfo": wants_service_info, "wantsClinicInfo": wants_clinic_info, "bookingAction": booking_action, "hasSpecificEntities": has_specific_entities}

    return {"intent": "QUERY_INFO", "wantsDoctorInfo": wants_doctor_info, "wantsServiceInfo": wants_service_info, "wantsClinicInfo": wants_clinic_info, "bookingAction": booking_action, "hasSpecificEntities": has_specific_entities}
