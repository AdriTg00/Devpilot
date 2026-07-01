import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

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


def _get_provider_key(settings: Settings, provider: str) -> str | None:
    """Get API key from settings first, then from env var."""
    if provider not in _KEY_MAP:
        return None
    setting_key, env_key = _KEY_MAP[provider]
    return getattr(settings, setting_key, None) or os.getenv(env_key)


@router.get("")
def get_settings():
    s = settings_service.get()
    warnings = _check_warnings(s)
    return {"settings": s.model_dump(), "warnings": warnings}


@router.put("")
def update_settings(updates: Settings):
    saved = settings_service.update(updates.model_dump())
    _reinit_llm_service()
    warnings = _check_warnings(saved)
    return {"settings": saved.model_dump(), "warnings": warnings}


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

    try:
        if req.provider == "openai":
            from openai import OpenAI
            client = OpenAI(api_key=req.api_key, timeout=10)
            client.models.list()

        elif req.provider == "anthropic":
            from anthropic import Anthropic
            client = Anthropic(api_key=req.api_key, timeout=10)
            client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=10,
                messages=[{"role": "user", "content": "hi"}],
            )

        elif req.provider == "google":
            import google.generativeai as genai
            genai.configure(api_key=req.api_key)
            genai.list_models()

        elif req.provider == "groq":
            from groq import Groq
            client = Groq(api_key=req.api_key, timeout=10)
            client.models.list()

        return TestProviderResponse(success=True, message=f"{req.provider.title()} connected successfully!")

    except Exception as e:
        reason = str(e)
        if "401" in reason or "unauthorized" in reason.lower() or "api key" in reason.lower() or "invalid" in reason.lower():
            msg = f"Connection failed: invalid API key for {req.provider.title()}"
        else:
            msg = f"Connection failed: {reason}"
        return TestProviderResponse(success=False, message=msg)


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
