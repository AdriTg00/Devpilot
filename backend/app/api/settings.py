import os

from fastapi import APIRouter

from app.models.settings import Settings
from app.services.settings_service import settings_service
from app.services.llm_service import _reinit_llm_service, get_llm_service

router = APIRouter(prefix="/settings", tags=["settings"])

_KEY_MAP = {
    "openai": "OPENAI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "google": "GOOGLE_API_KEY",
    "groq": "GROQ_API_KEY",
}


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


def _check_warnings(settings: Settings) -> list[str]:
    warnings = []
    provider = settings.provider
    if provider in _KEY_MAP:
        key_name = _KEY_MAP[provider]
        if not os.getenv(key_name):
            warnings.append(
                f"{provider.title()} requires {key_name} env var. "
                f"Falling back to Ollama (local). Set the key and save again to switch."
            )
    return warnings
