import re
import unicodedata
from typing import Any
import google.generativeai as genai
from config import settings
from db.mongo import knowledge_col


def normalize_vietnamese(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    without_diacritics = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    return without_diacritics.replace("đ", "d").replace("Đ", "D").lower()


def tokenize(text: str) -> list[str]:
    raw = re.sub(r"[?!.,:;()\[\]{}'\"]+", " ", text.lower()).split()
    normalized = re.sub(r"[?!.,:;()\[\]{}'\"]+", " ", normalize_vietnamese(text)).split()
    tokens = list({w for w in raw + normalized if len(w) > 1})
    return tokens


async def create_embedding(text: str) -> list[float]:
    keys = settings.gemini_keys()
    if not keys:
        raise ValueError("No GEMINI_API_KEY configured")
    genai.configure(api_key=keys[0])
    result = genai.embed_content(
        model=f"models/{settings.GEMINI_EMBEDDING_MODEL}",
        content=text[:12000],
    )
    return result["embedding"]


def _normalize_doc(doc: dict, metadata: dict | None = None) -> dict:
    meta = metadata or {}
    return {
        "pageContent": f"[{doc.get('title', '')}]\n{doc.get('content', '')}",
        "content": doc.get("content", ""),
        "metadata": {
            "title": doc.get("title", "Nguồn tham khảo"),
            "source": doc.get("source", "manual"),
            "category": doc.get("category", "general"),
            "knowledgeId": str(doc.get("_id", "")),
            "keywords": doc.get("keywords") or [],
            **meta,
        },
    }


async def keyword_search(query: str, top_k: int) -> list[dict]:
    words = tokenize(query)
    if not words:
        return []

    pattern = "|".join(re.escape(w) for w in words)
    regex = re.compile(pattern, re.IGNORECASE)
    col = knowledge_col()

    direct_docs = await col.find(
        {
            "isActive": True,
            "$or": [
                {"title": {"$regex": pattern, "$options": "i"}},
                {"content": {"$regex": pattern, "$options": "i"}},
                {"keywords": {"$elemMatch": {"$regex": pattern, "$options": "i"}}},
            ],
        },
        {"title": 1, "content": 1, "category": 1, "keywords": 1, "source": 1},
    ).limit(max(top_k * 4, 20)).to_list(length=max(top_k * 4, 20))

    if len(direct_docs) < top_k:
        scan_limit = settings.RAG_KEYWORD_SCAN_LIMIT
        scan_docs = await col.find(
            {"isActive": True},
            {"title": 1, "content": 1, "category": 1, "keywords": 1, "source": 1},
        ).sort("updatedAt", -1).limit(scan_limit).to_list(length=scan_limit)
    else:
        scan_docs = []

    merged: dict[str, dict] = {}
    for doc in direct_docs + scan_docs:
        merged[str(doc["_id"])] = doc

    def score_doc(doc: dict) -> float:
        raw_text = f"{doc.get('title','')} {doc.get('content','')} {' '.join(doc.get('keywords') or [])}".lower()
        norm_text = normalize_vietnamese(raw_text)
        count = 0
        for w in words:
            count += len(re.findall(re.escape(w), raw_text)) + len(re.findall(re.escape(w), norm_text))
        return count

    scored = [(doc, score_doc(doc)) for doc in merged.values()]
    scored = [(d, s) for d, s in scored if s > 0]
    scored.sort(key=lambda x: x[1], reverse=True)
    max_score = scored[0][1] if scored else 1.0

    return [
        _normalize_doc(doc, {"keywordScore": s / max_score, "score": s / max_score, "retrievalMode": "keyword"})
        for doc, s in scored[:top_k]
    ]


def _rerank(query: str, docs: list[dict]) -> list[dict]:
    if not settings.RAG_RERANK_ENABLED:
        return docs
    words = tokenize(query)
    if not words:
        return docs

    def lexical_score(doc: dict) -> float:
        text = f"{doc['metadata'].get('title','')} {doc['content']}".lower()
        return sum(1 for w in words if w in text) / len(words)

    return sorted(docs, key=lexical_score, reverse=True)


async def hybrid_retrieve(query: str, top_k: int | None = None) -> list[dict]:
    k = top_k or settings.RAG_TOP_K
    col = knowledge_col()
    merged: dict[str, dict[str, Any]] = {}

    # Vector search
    try:
        query_vector = await create_embedding(query)
        pipeline = [
            {
                "$vectorSearch": {
                    "index": settings.ATLAS_VECTOR_INDEX,
                    "path": settings.ATLAS_VECTOR_PATH,
                    "queryVector": query_vector,
                    "numCandidates": settings.ATLAS_VECTOR_CANDIDATES,
                    "limit": k * 2,
                    "filter": {"isActive": True},
                }
            },
            {
                "$project": {
                    "title": 1,
                    "content": 1,
                    "category": 1,
                    "keywords": 1,
                    "source": 1,
                    "score": {"$meta": "vectorSearchScore"},
                }
            },
        ]
        results = await col.aggregate(pipeline).to_list(length=k * 2)
        for doc in results:
            key = str(doc["_id"])
            merged[key] = {
                "doc": _normalize_doc(doc, {"vectorScore": float(doc.get("score", 0)), "retrievalMode": "vector"}),
                "vectorScore": float(doc.get("score", 0)),
                "keywordScore": 0.0,
            }
    except Exception as e:
        print(f"[RAG] Vector search failed, using keyword only: {e}")

    # Keyword search
    kw_docs = await keyword_search(query, k * 2)
    for d in kw_docs:
        key = d["metadata"]["knowledgeId"] or d["pageContent"][:120]
        if key in merged:
            merged[key]["keywordScore"] = max(merged[key]["keywordScore"], float(d["metadata"].get("keywordScore", 0)))
            merged[key]["doc"]["metadata"]["retrievalMode"] = "hybrid"
        else:
            merged[key] = {
                "doc": d,
                "vectorScore": 0.0,
                "keywordScore": float(d["metadata"].get("keywordScore", 0)),
            }

    vw = settings.RAG_VECTOR_WEIGHT
    kw = settings.RAG_KEYWORD_WEIGHT
    ranked = sorted(
        merged.values(),
        key=lambda x: x["vectorScore"] * vw + x["keywordScore"] * kw,
        reverse=True,
    )

    docs = [item["doc"] for item in ranked[:k * 2]]
    min_score = settings.RAG_MIN_SCORE
    if min_score > 0:
        docs = [d for d in docs if float(d["metadata"].get("score", 0)) >= min_score]

    # Dedup
    seen: set[str] = set()
    unique: list[dict] = []
    for doc in docs:
        key = doc["content"][:240].lower()
        if key not in seen:
            seen.add(key)
            unique.append(doc)

    unique = _rerank(query, unique)
    return unique[:k]
