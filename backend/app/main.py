import json
import logging
import time
import uuid
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Depends
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from prometheus_client import Counter, Histogram, generate_latest, REGISTRY

# app.core.config debe importarse antes que cualquier otro modulo de la app
# para garantizar que load_dotenv() se ejecuta y las variables de entorno
# estan disponibles cuando LLMService y otros modulos las leen.
from app.core.config import CORS_ORIGINS, BASE_URL

# ── Logging estructurado (JSON) ──────────────────────────────────────────

class JsonFormatter(logging.Formatter):
    def format(self, record):
        entry = {
            "ts": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if hasattr(record, "request_id"):
            entry["req_id"] = record.request_id
        if record.exc_info and record.exc_info[1]:
            entry["exc"] = str(record.exc_info[1])
        return json.dumps(entry)

_handler = logging.StreamHandler()
_handler.setFormatter(JsonFormatter())
logging.basicConfig(level=logging.INFO, handlers=[_handler])
_logger = logging.getLogger("devpilot")

# ── Prometheus metrics ─────────────────────────────────────────────────────

REQUEST_COUNT = Counter("http_requests_total", "Total HTTP requests", ["method", "path", "status"])
REQUEST_LATENCY = Histogram("http_request_duration_seconds", "HTTP request duration")

# ── Rate limiter ──────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])

# ── Lifespan (startup / shutdown) ──────────────────────────────────────────

@asynccontextmanager
async def lifespan(_app: FastAPI):
    from app.db.database import init_db
    from app.services.auth_service import seed_default_user
    init_db()
    seed_default_user()
    yield

# ── App ───────────────────────────────────────────────────────────────────

app = FastAPI(
    title="DevPilot AI",
    description="Herramientas inteligentes para el desarrollo de software con IA local.",
    version="0.2.0",
    docs_url="/docs",
    redoc_url=None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request ID + Metrics middleware ────────────────────────────────────────

class ObservabilityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        req_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
        request.state.request_id = req_id
        start = time.perf_counter()
        response = await call_next(request)
        duration = time.perf_counter() - start
        response.headers["X-Request-ID"] = req_id
        REQUEST_COUNT.labels(
            method=request.method,
            path=request.url.path,
            status=response.status_code,
        ).inc()
        REQUEST_LATENCY.observe(duration)
        return response

app.add_middleware(ObservabilityMiddleware)

# ── Global exception handler ──────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    req_id = getattr(request.state, "request_id", "?")
    _logger.error("Unhandled error [req=%s] %s: %s", req_id, type(exc).__name__, exc)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "internal_error",
                "message": "An unexpected error occurred",
                "request_id": req_id,
            }
        },
    )

# ── Routers (API versioning con /api/v1) ──────────────────────────────────

from app.core.security import get_current_user

from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.projects import router as project_router
from app.api.tools import router as tools_router
from app.api.settings import router as settings_router
from app.api.shares import router as shares_router

API_V1 = "/api/v1"

app.include_router(auth_router, prefix=API_V1)

# Chat — protegido (cada request cuesta tokens/cuota)
app.include_router(chat_router, prefix=API_V1, dependencies=[Depends(get_current_user)])

# Projects — protegido (mutaciones y acceso a filesystem)
app.include_router(project_router, prefix=API_V1, dependencies=[Depends(get_current_user)])

# Tools — protegido (lectura de filesystem)
app.include_router(tools_router, prefix=API_V1, dependencies=[Depends(get_current_user)])

# Settings — protegido (configuracion del sistema)
app.include_router(settings_router, prefix=API_V1, dependencies=[Depends(get_current_user)])

# Shares — crear shares protegido, ver shares público
app.include_router(shares_router, prefix=API_V1, dependencies=[Depends(get_current_user)])

# ── Public endpoints (sin versioning, sin auth) ───────────────────────────

app_start_time = time.time()


@app.get("/metrics")
def metrics():
    return Response(content=generate_latest(REGISTRY), media_type="text/plain")


@app.get("/health")
def health():
    return JSONResponse({"status": "ok", "version": "0.2.0"})


@app.get("/shared/{token}")
def get_shared_project(token: str):
    from app.services.share_service import share_service
    from fastapi import HTTPException
    entry = share_service.get_share(token)
    if not entry:
        raise HTTPException(status_code=404, detail="Share not found or expired")
    return JSONResponse(content=entry)


@app.get("/health/detailed")
def health_detailed():
    from app.services.rag_service import rag_service
    from app.services.llm_service import get_llm_service
    from app.services.settings_service import settings_service
    from app.core.config import MEMORY_STORAGE_PATH, SHARES_STORAGE_PATH

    uptime = time.time() - app_start_time

    ollama_status = {"reachable": False, "models": [], "error": None}
    try:
        import ollama
        resp = ollama.list()
        ollama_status["reachable"] = True
        ollama_status["models"] = [m.get("model") or m.get("name") for m in resp.get("models", [])]
    except Exception as e:
        ollama_status["error"] = str(e)

    rag_status = rag_service.status()
    rag_ready = rag_service.is_ready

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

    mem_path = Path(MEMORY_STORAGE_PATH)
    mem_size = mem_path.stat().st_size if mem_path.exists() else 0

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
        "version": "0.2.0",
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
