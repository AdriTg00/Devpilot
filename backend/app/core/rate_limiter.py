import logging
import time
from collections import defaultdict
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

TIERS: dict[str, dict] = {
    "stream": {
        "limit": 5,
        "window": 60,
        "msg": "Streaming requests limited to 5 per minute. Please wait before trying again.",
    },
    "costly": {
        "limit": 10,
        "window": 60,
        "msg": "Analysis requests limited to 10 per minute. Please wait before trying again.",
    },
    "cheap": {
        "limit": 120,
        "window": 60,
        "msg": "",
    },
    "normal": {
        "limit": 30,
        "window": 60,
        "msg": "Too many requests. Please slow down.",
    },
}

STREAM_PATHS = (
    "/chat-stream",
    "/question-stream",
    "/tool-stream",
    "/explain-file",
    "/explain-project",
    "/summary",
    "/code-review",
    "/documentation",
    "/readme",
    "/ai-fix",
)

COSTLY_PATHS = (
    "/analyze",
    "/rag-reindex",
    "/upload",
)

CHEAP_PATHS = (
    "/settings",
    "/sessions",
    "/read-file",
    "/save-file",
    "/search",
    "/files",
    "/close",
    "/share",
    "/code-review/categories",
    "/rag-status",
    "/rag-clear",
    "/question",
    "/test-provider",
)


def _classify(path: str) -> str | None:
    if path in ("/health", "/health/detailed", "/metrics"):
        return None
    if any(p in path for p in STREAM_PATHS):
        return "stream"
    if any(p in path for p in COSTLY_PATHS):
        return "costly"
    if any(p in path for p in CHEAP_PATHS):
        return "cheap"
    return "normal"


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._windows: dict[str, list[float]] = defaultdict(list)

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        tier = _classify(request.url.path)
        if tier is not None:
            cfg = TIERS[tier]
            client_host = request.client.host if request.client else "unknown"
            key = f"{client_host}:{tier}"
            now = time.time()
            cutoff = now - cfg["window"]
            bucket = self._windows[key]
            bucket[:] = [t for t in bucket if t > cutoff]
            if len(bucket) >= cfg["limit"]:
                msg = cfg["msg"]
                logger.warning("Rate limited %s on %s (tier=%s)", key, request.url.path, tier)
                return JSONResponse(status_code=429, content={"detail": msg})
            bucket.append(now)

        return await call_next(request)
