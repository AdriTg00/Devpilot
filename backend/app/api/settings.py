import os
import time

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.settings import Settings
from app.services.llm_service import _reinit_llm_service
from app.services.settings_service import settings_service

router = APIRouter(prefix="/settings", tags=["settings"])

_KEY_MAP = {
    "openai": ("openai_api_key", "OPENAI_API_KEY"),
    "anthropic": ("anthropic_api_key", "ANTHROPIC_API_KEY"),
    "google": ("google_api_key", "GOOGLE_API_KEY"),
    "groq": ("groq_api_key", "GROQ_API_KEY"),
}

_QUOTA_CACHE: dict[str, dict] = {}
_QUOTA_TTL = 300  # 5 minutes

_TEST_MODELS = {
    "openai": "gpt-4o-mini",
    "anthropic": "claude-3-5-haiku-20241022",
    "google": "gemini-2.0-flash",
    "groq": "llama-3.1-8b-instant",
}


def _check_quota(provider: str, api_key: str) -> dict:
    """Test if a provider has available quota/credits by making a tiny completion.
    Results are cached for _QUOTA_TTL seconds to avoid repeated charges."""
    cached = _QUOTA_CACHE.get(provider)
    if cached and (time.time() - cached.get("_ts", 0)) < _QUOTA_TTL:
        return {k: v for k, v in cached.items() if k != "_ts"}

    result = {"has_quota": True, "message": "", "error": None}
    try:
        if provider == "openai":
            from openai import OpenAI
            client = OpenAI(api_key=api_key, timeout=10)
            client.chat.completions.create(
                model=_TEST_MODELS[provider],
                max_tokens=1,
                messages=[{"role": "user", "content": "hi"}],
            )

        elif provider == "anthropic":
            from anthropic import Anthropic
            client = Anthropic(api_key=api_key, timeout=10)
            client.messages.create(
                model=_TEST_MODELS[provider],
                max_tokens=10,
                messages=[{"role": "user", "content": "hi"}],
            )

        elif provider == "google":
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(_TEST_MODELS[provider])
            model.generate_content("hi", generation_config={"max_output_tokens": 1})

        elif provider == "groq":
            from groq import Groq
            client = Groq(api_key=api_key, timeout=10)
            client.chat.completions.create(
                model=_TEST_MODELS[provider],
                max_tokens=1,
                messages=[{"role": "user", "content": "hi"}],
            )

        _QUOTA_CACHE[provider] = {"has_quota": True, "message": "", "error": None, "_ts": time.time()}
        return _QUOTA_CACHE[provider]

    except Exception as e:
        reason = str(e).lower()
        if any(w in reason for w in ("quota", "credit", "insufficient", "429", "rate limit", "billing", "payment")):
            result = {"has_quota": False, "message": f"{provider.title()}: insufficient quota or credits", "error": str(e)}
        elif "401" in reason or "unauthorized" in reason or "api key" in reason or "invalid" in reason or "not found" in reason:
            result = {"has_quota": False, "message": f"{provider.title()}: invalid API key", "error": str(e)}
        else:
            result = {"has_quota": True, "message": f"{provider.title()}: connected (quota check skipped)", "error": str(e) if str(e) else None}
        _QUOTA_CACHE[provider] = {**result, "_ts": time.time()}
        return result


def get_quota_status(provider: str | None = None) -> dict:
    if provider:
        return _QUOTA_CACHE.get(provider, {"has_quota": True, "message": f"{provider}: unknown", "error": None})
    return dict(_QUOTA_CACHE)


def _get_provider_key(settings: Settings, provider: str) -> str | None:
    """Get API key from settings first, then from env var."""
    if provider not in _KEY_MAP:
        return None
    setting_key, env_key = _KEY_MAP[provider]
    return getattr(settings, setting_key, None) or os.getenv(env_key)


@router.get("")
def get_settings(db: Session = Depends(get_db)):
    s = settings_service.get(db=db)
    warnings = _check_warnings(s)
    return {"settings": s.model_dump(), "warnings": warnings}


@router.put("")
def update_settings(updates: Settings, db: Session = Depends(get_db)):
    saved = settings_service.update(updates.model_dump(), db=db)
    db.commit()
    _reinit_llm_service()
    warnings = _check_warnings(saved)
    return {"settings": saved.model_dump(), "warnings": warnings}


@router.get("/quota")
def get_quota():
    return get_quota_status()


class TestProviderRequest(BaseModel):
    provider: str
    api_key: str


class TestProviderResponse(BaseModel):
    success: bool
    message: str


@router.post("/test-provider", response_model=TestProviderResponse)
def test_provider(req: TestProviderRequest):
    if req.provider not in _KEY_MAP:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {req.provider}")

    q = _check_quota(req.provider, req.api_key)
    if q["has_quota"]:
        return TestProviderResponse(success=True, message=f"{req.provider.title()} connected successfully!")
    return TestProviderResponse(success=False, message=q["message"])


def _check_warnings(settings: Settings) -> list[str]:
    warnings = []
    provider = settings.provider
    if provider in _KEY_MAP:
        if not _get_provider_key(settings, provider):
            name = provider.title()
            setting_field, env_var = _KEY_MAP[provider]
            warnings.append(
                f"{name} requires an API key. "
                f"Set it in Settings or add {env_var} to your .env file. "
                f"Falling back to Ollama (local)."
            )
    return warnings
