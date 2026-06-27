from fastapi import APIRouter

from app.models.settings import Settings
from app.services.settings_service import settings_service
from app.services.llm_service import _reinit_llm_service

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
def get_settings():
    return settings_service.get()


@router.put("")
def update_settings(updates: Settings):
    saved = settings_service.update(updates.model_dump())
    _reinit_llm_service()
    return saved
