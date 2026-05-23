from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.MONGODB_URI)
    return _client


def get_db():
    return get_client().get_default_database()


def knowledge_col():
    return get_db()["knowledges"]


def service_col():
    return get_db()["services"]


def doctor_col():
    return get_db()["doctors"]


def user_col():
    return get_db()["users"]


def schedule_col():
    return get_db()["schedules"]


def appointment_col():
    return get_db()["appointments"]


def leave_request_col():
    return get_db()["leaverequests"]


def settings_col():
    return get_db()["settings"]
