import logging

from app.db.database import SessionLocal
from app.db.models import Setting
from app.models.settings import Settings
from app.services.rag_service import rag_service

logger = logging.getLogger(__name__)

_SETTINGS_KEY = "app_settings"


class SettingsService:
    def _load(self) -> dict:
        db = SessionLocal()
        try:
            row = db.query(Setting).filter(Setting.key == _SETTINGS_KEY).first()
            return row.value if row else {}
        finally:
            db.close()

    def _save(self, data: dict):
        db = SessionLocal()
        try:
            row = db.query(Setting).filter(Setting.key == _SETTINGS_KEY).first()
            if row:
                row.value = data
            else:
                db.add(Setting(key=_SETTINGS_KEY, value=data))
            db.commit()
        finally:
            db.close()

    def get(self) -> Settings:
        return Settings(**self._load())

    def update(self, updates: dict) -> Settings:
        current = self._load()
        current.update(updates)
        self._save(current)
        settings = Settings(**current)
        rag_service.configure(
            chunk_lines=settings.rag_chunk_lines,
            overlap_lines=settings.rag_overlap_lines,
            max_chunks_per_file=settings.rag_max_chunks_per_file,
            max_results=settings.rag_max_results,
        )
        logger.info("Settings updated: %s", {k: v for k, v in updates.items()})
        return settings


settings_service = SettingsService()

rag_service.configure(
    chunk_lines=settings_service.get().rag_chunk_lines,
    overlap_lines=settings_service.get().rag_overlap_lines,
    max_chunks_per_file=settings_service.get().rag_max_chunks_per_file,
    max_results=settings_service.get().rag_max_results,
)
