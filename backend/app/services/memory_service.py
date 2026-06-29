import json
import logging
import os
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

MAX_HISTORY_PER_KEY = 20
MAX_HISTORY_CHARS = 4000
SESSION_INDEX_KEY = "_session_index"


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

    # --- Session management ---

    def _session_key(self, session_id: str) -> str:
        return f"_session:{session_id}"

    def _migrate_project_sessions(self, project: str):
        """Migrate existing project key to a named session once."""
        index = self._get_or_create(SESSION_INDEX_KEY)
        sessions = index.get(project, [])
        existing_ids = {s["id"] for s in sessions}
        existing_key = project
        if existing_key in self._stores and existing_key not in existing_ids:
            msgs = self._stores[existing_key]
            if msgs:
                sid = f"default-{project.replace('/', '_').replace('\\\\', '_')}"
                sessions.insert(0, {
                    "id": sid,
                    "name": "Default",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                })
                self._stores[self._session_key(sid)] = msgs
                index[project] = sessions
                self._save()

    def list_sessions(self, project: str) -> list[dict]:
        self._migrate_project_sessions(project)
        index = self._get_or_create(SESSION_INDEX_KEY)
        return index.get(project, [])

    def create_session(self, project: str, name: str = "") -> dict:
        session_id = uuid.uuid4().hex[:8]
        now = datetime.now(timezone.utc).isoformat()
        index = self._get_or_create(SESSION_INDEX_KEY)
        sessions = index.setdefault(project, [])
        entry = {
            "id": session_id,
            "name": name or f"Session {len(sessions) + 1}",
            "created_at": now,
            "updated_at": now,
        }
        sessions.append(entry)
        self._stores[self._session_key(session_id)] = []
        self._save()
        return entry

    def rename_session(self, session_id: str, name: str):
        index = self._get_or_create(SESSION_INDEX_KEY)
        for sessions in index.values():
            for s in sessions:
                if s["id"] == session_id:
                    s["name"] = name
                    s["updated_at"] = datetime.now(timezone.utc).isoformat()
                    self._save()
                    return s
        return None

    def delete_session(self, session_id: str):
        key = self._session_key(session_id)
        self._stores.pop(key, None)
        index = self._get_or_create(SESSION_INDEX_KEY)
        for proj in list(index.keys()):
            index[proj] = [s for s in index[proj] if s["id"] != session_id]
            if not index[proj]:
                del index[proj]
        self._save()

    def get_session_messages(self, session_id: str) -> list[dict]:
        return self._get_or_create(self._session_key(session_id))

    def add_session_message(self, session_id: str, role: str, content: str):
        self.add(self._session_key(session_id), role, content)
        # Update timestamp
        index = self._get_or_create(SESSION_INDEX_KEY)
        for sessions in index.values():
            for s in sessions:
                if s["id"] == session_id:
                    s["updated_at"] = datetime.now(timezone.utc).isoformat()
                    self._save()
                    return


def _get_storage_path() -> str:
    try:
        from app.core.config import MEMORY_STORAGE_PATH
        return MEMORY_STORAGE_PATH
    except ImportError:
        return ""


memory_service = MemoryService(storage_path=_get_storage_path())
