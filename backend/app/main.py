import logging
import time
import json
from pathlib import Path

# app.core.config debe importarse antes que cualquier otro modulo de la app
# para garantizar que load_dotenv() se ejecuta y las variables de entorno
# estan disponibles cuando LLMService y otros modulos las leen.
from app.core.config import CORS_ORIGINS, BASE_URL
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.api.chat import router as chat_router
from app.api.projects import router as project_router
from app.api.tools import router as tools_router
from app.api.settings import router as settings_router
from app.api.shares import router as shares_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app_start_time = time.time()

app = FastAPI(
    title="DevPilot AI",
    description="Herramientas inteligentes para el desarrollo de software con IA local.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(project_router)
app.include_router(tools_router)
app.include_router(settings_router)
app.include_router(shares_router)


@app.get("/health")
def health():
    return JSONResponse({"status": "ok", "version": "0.1.0"})


@app.get("/health/detailed")
def health_detailed():
    from app.services.rag_service import rag_service
    from app.services.llm_service import get_llm_service
    from app.services.settings_service import settings_service
    from app.core.config import MEMORY_STORAGE_PATH, SHARES_STORAGE_PATH

    uptime = time.time() - app_start_time

    # Ollama check
    ollama_status = {"reachable": False, "models": [], "error": None}
    try:
        import ollama
        resp = ollama.list()
        ollama_status["reachable"] = True
        ollama_status["models"] = [m.get("model") or m.get("name") for m in resp.get("models", [])]
    except Exception as e:
        ollama_status["error"] = str(e)

    # ChromaDB / RAG check
    rag_status = rag_service.status()
    rag_ready = rag_service.is_ready

    # Groq check
    import os
    groq_key = os.getenv("GROQ_API_KEY")
    groq_status = {"configured": bool(groq_key), "reachable": False}
    if groq_key:
        try:
            from groq import Groq
            Groq(api_key=groq_key).models.list()
            groq_status["reachable"] = True
        except Exception:
            groq_status["reachable"] = False

    # Memory storage
    mem_path = Path(MEMORY_STORAGE_PATH)
    mem_size = mem_path.stat().st_size if mem_path.exists() else 0

    # Shares storage
    shares_path = Path(SHARES_STORAGE_PATH)
    shares_count = 0
    if shares_path.exists():
        try:
            shares_data = json.loads(shares_path.read_text("utf-8"))
            shares_count = len(shares_data)
        except Exception:
            pass

    settings = settings_service.get()

    return JSONResponse({
        "status": "ok",
        "version": "0.1.0",
        "uptime_seconds": round(uptime),
        "settings": {
            "provider": settings.provider,
            "model": get_llm_service().model_name,
            "temperature": settings.temperature,
            "max_tokens": settings.max_tokens,
        },
        "services": {
            "ollama": ollama_status,
            "groq": groq_status,
            "rag": rag_status,
            "rag_ready": rag_ready,
        },
        "storage": {
            "memory_path": str(mem_path),
            "memory_bytes": mem_size,
            "shares_count": shares_count,
        },
        "base_url": BASE_URL,
    })