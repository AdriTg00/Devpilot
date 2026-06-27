import json
import logging
import os
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

MAX_HISTORY_PER_KEY = 20
MAX_HISTORY_CHARS = 4000


class MemoryService:
    def __init__(self, storage_path: str = ""):
        self._storage_path = storage_path
        self._stores: dict[str, list[dict]] = {}
        self._load()

    def _load(self):
        if not self._storage_path:
            return
        path = Path(self._storage_path)
        if not path.exists():
            return
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self._stores = {
                k: v[-MAX_HISTORY_PER_KEY:]
                for k, v in data.items()
                if isinstance(v, list)
            }
            logger.info("Memory loaded from %s (%d keys)", path, len(self._stores))
        except Exception as exc:
            logger.warning("Could not load memory from %s: %s", path, exc)
            self._stores = {}

    def _save(self):
        if not self._storage_path:
            return
        path = Path(self._storage_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp = tempfile.mkstemp(suffix=".json", dir=path.parent)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(self._stores, f, ensure_ascii=False, indent=2)
            os.replace(tmp, path)
        except Exception:
            os.unlink(tmp)
            raise

    def _get_or_create(self, key: str) -> list[dict]:
        if key not in self._stores:
            self._stores[key] = []
        return self._stores[key]

    def add(self, key: str, role: str, content: str):
        history = self._get_or_create(key)
        history.append({"role": role, "content": content})
        if len(history) > MAX_HISTORY_PER_KEY:
            history.pop(0)
        self._save()

    def get_history(self, key: str) -> list[dict]:
        return self._get_or_create(key)

    def build_context(self, key: str) -> str:
        history = self.get_history(key)
        if not history:
            return ""
        lines = []
        total = 0
        for entry in history:
            text = f"{entry['role']}: {entry['content']}"
            total += len(text)
            if total > MAX_HISTORY_CHARS:
                break
            lines.append(text)
        return "\n".join(lines)

    def clear(self, key: str):
        self._stores.pop(key, None)
        self._save()


def _get_storage_path() -> str:
    try:
        from app.core.config import MEMORY_STORAGE_PATH
        return MEMORY_STORAGE_PATH
    except ImportError:
        return ""


memory_service = MemoryService(storage_path=_get_storage_path())
