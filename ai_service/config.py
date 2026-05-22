from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    MONGODB_URI: str = ""
    GEMINI_API_KEY: str = ""
    GEMINI_API_KEY_2: str = ""
    GEMINI_API_KEY_3: str = ""
    GEMINI_CHAT_MODELS: str = "gemini-2.5-flash,gemini-2.0-flash"
    GEMINI_EMBEDDING_MODEL: str = "embedding-001"
    ATLAS_VECTOR_INDEX: str = "knowledge_vector_index"
    ATLAS_VECTOR_PATH: str = "embedding"
    ATLAS_VECTOR_CANDIDATES: int = 100
    RAG_TOP_K: int = 10
    RAG_MIN_SCORE: float = 0.0
    RAG_KEYWORD_SCAN_LIMIT: int = 200
    RAG_RERANK_ENABLED: bool = True
    RAG_VECTOR_WEIGHT: float = 0.7
    RAG_KEYWORD_WEIGHT: float = 0.3
    PORT: int = 8000

    model_config = {"env_file": ".env", "extra": "ignore"}

    def gemini_keys(self) -> list[str]:
        return [k for k in [self.GEMINI_API_KEY, self.GEMINI_API_KEY_2, self.GEMINI_API_KEY_3] if k]

    def gemini_models(self) -> list[str]:
        return [m.strip() for m in self.GEMINI_CHAT_MODELS.split(",") if m.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
