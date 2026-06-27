import json
import logging
import os
import tempfile
from pathlib import Path

from app.models.settings import Settings
from app.services.rag_service import rag_service

logger = logging.getLogger(__name__)

SETTINGS_FILE = Path(__file__).parents[2] / ".settings" / "settings.json"


class SettingsService:
    def __init__(self, storage_path: Path = SETTINGS_FILE):
        self._path = storage_path
        self._settings = self._load()

    def _load(self) -> Settings:
        if not self._path.exists():
            logger.info("No settings file found at %s, using defaults", self._path)
            return Settings()
        try:
            with open(self._path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return Settings(**data)
        except Exception as exc:
            logger.warning("Could not load settings from %s: %s", self._path, exc)
            return Settings()

    def _save(self):
        self._path.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp = tempfile.mkstemp(suffix=".json", dir=self._path.parent)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(self._settings.model_dump(), f, ensure_ascii=False, indent=2)
            os.replace(tmp, self._path)
        except Exception:
            os.unlink(tmp)
            raise

    def get(self) -> Settings:
        return self._settings

    def update(self, updates: dict) -> Settings:
        data = self._settings.model_dump()
        data.update(updates)
        self._settings = Settings(**data)
        self._save()
        rag_service.configure(
            chunk_lines=self._settings.rag_chunk_lines,
            overlap_lines=self._settings.rag_overlap_lines,
            max_chunks_per_file=self._settings.rag_max_chunks_per_file,
            max_results=self._settings.rag_max_results,
        )
        logger.info("Settings updated: %s", updates)
        return self._settings


settings_service = SettingsService()

rag_service.configure(
    chunk_lines=settings_service.get().rag_chunk_lines,
    overlap_lines=settings_service.get().rag_overlap_lines,
    max_chunks_per_file=settings_service.get().rag_max_chunks_per_file,
    max_results=settings_service.get().rag_max_results,
)
