import json
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm.attributes import flag_modified

from app.db.database import SessionLocal
from app.db.models import Message, Setting

logger = logging.getLogger(__name__)

MAX_HISTORY_PER_KEY = 20
MAX_HISTORY_CHARS = 4000
SESSION_INDEX_SETTING_KEY = "session_index"


class MemoryService:
    # --- JSON → SQLite migration (one-time) ---

    def _maybe_migrate_from_json(self, db):
        try:
            from app.core.config import MEMORY_STORAGE_PATH
        except ImportError:
            return
        from pathlib import Path
        path = Path(MEMORY_STORAGE_PATH)
        if not path.exists():
            return
        try:
            data = json.loads(path.read_text("utf-8"))
        except Exception:
            return
        if not isinstance(data, dict) or not data:
            return
        existing = db.query(func.count(Message.id)).scalar()
        if existing > 0:
            return  # ya migrado

        for key, msgs in data.items():
            if not isinstance(msgs, list):
                continue
            for msg in msgs[-MAX_HISTORY_PER_KEY:]:
                db.add(Message(
                    key=key,
                    role=msg.get("role", "user"),
                    content=msg.get("content", ""),
                ))
        db.commit()
        path.rename(path.with_suffix(".json.migrated"))
        logger.info("Migrated %d keys from JSON to SQLite", len(data))

    # --- Core operations ---

    def add(self, key: str, role: str, content: str):
        db = SessionLocal()
        try:
            db.add(Message(key=key, role=role, content=content))
            # trim old messages per key
            keep_ids = [
                r[0] for r in
                db.query(Message.id)
                .filter(Message.key == key)
                .order_by(Message.id.desc())
                .limit(MAX_HISTORY_PER_KEY)
                .all()
            ]
            if keep_ids:
                db.query(Message).filter(
                    Message.key == key,
                    Message.id.notin_(keep_ids),
                ).delete()
            db.commit()
        finally:
            db.close()

    def get_history(self, key: str) -> list[dict]:
        db = SessionLocal()
        try:
            rows = (
                db.query(Message)
                .filter(Message.key == key)
                .order_by(Message.id)
                .all()
            )
            return [{"role": r.role, "content": r.content} for r in rows]
        finally:
            db.close()

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
        db = SessionLocal()
        try:
            db.query(Message).filter(Message.key == key).delete()
            db.commit()
        finally:
            db.close()

    # --- Session management ---

    def _session_key(self, session_id: str) -> str:
        return f"_session:{session_id}"

    def _load_sessions(self, db, project: str) -> list[dict]:
        row = db.query(Setting).filter(Setting.key == SESSION_INDEX_SETTING_KEY).first()
        if not row or not isinstance(row.value, dict):
            return []
        return row.value.get(project, [])

    def _save_sessions(self, db, project: str, sessions: list[dict]):
        row = db.query(Setting).filter(Setting.key == SESSION_INDEX_SETTING_KEY).first()
        data = row.value if (row and isinstance(row.value, dict)) else {}
        if sessions:
            data[project] = sessions
        else:
            data.pop(project, None)
        if row:
            row.value = data
            flag_modified(row, "value")
        else:
            db.add(Setting(key=SESSION_INDEX_SETTING_KEY, value=data))
        db.commit()

    def _migrate_project_sessions(self, project: str):
        db = SessionLocal()
        try:
            sessions = self._load_sessions(db, project)
            safe_name = project.replace("/", "_").replace("\\", "_")
            default_sid = f"default-{safe_name}"
            existing_ids = {s["id"] for s in sessions}
            msgs = (
                db.query(Message)
                .filter(Message.key == project)
                .order_by(Message.id)
                .all()
            )
            if msgs and default_sid not in existing_ids:
                sessions.insert(0, {
                    "id": default_sid,
                    "name": "Default",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                })
                self._save_sessions(db, project, sessions)
        finally:
            db.close()

    def list_sessions(self, project: str) -> list[dict]:
        self._migrate_project_sessions(project)
        db = SessionLocal()
        try:
            return self._load_sessions(db, project)
        finally:
            db.close()

    def create_session(self, project: str, name: str = "") -> dict:
        db = SessionLocal()
        try:
            sessions = self._load_sessions(db, project)
            session_id = uuid.uuid4().hex[:8]
            now = datetime.now(timezone.utc).isoformat()
            entry = {
                "id": session_id,
                "name": name or f"Session {len(sessions) + 1}",
                "created_at": now,
                "updated_at": now,
                "project": project,
            }
            sessions.append(entry)
            self._save_sessions(db, project, sessions)
            return entry
        finally:
            db.close()

    def get_session_project(self, session_id: str) -> str | None:
        """Return the project path associated with a session, or None if not found."""
        db = SessionLocal()
        try:
            row = db.query(Setting).filter(Setting.key == SESSION_INDEX_SETTING_KEY).first()
            if not row or not isinstance(row.value, dict):
                return None
            for project, sessions in row.value.items():
                for s in sessions:
                    if s.get("id") == session_id:
                        # prefer the stored project field, fall back to the index key
                        return s.get("project") or (project if project != "_casual" else None)
            return None
        finally:
            db.close()

    def rename_session(self, session_id: str, name: str):
        db = SessionLocal()
        try:
            row = db.query(Setting).filter(Setting.key == SESSION_INDEX_SETTING_KEY).first()
            if not row or not isinstance(row.value, dict):
                return None
            data = dict(row.value)
            for proj_sessions in data.values():
                for s in proj_sessions:
                    if s["id"] == session_id:
                        s["name"] = name
                        s["updated_at"] = datetime.now(timezone.utc).isoformat()
                        row.value = data
                        flag_modified(row, "value")
                        db.commit()
                        return s
            return None
        finally:
            db.close()

    def delete_session(self, session_id: str):
        db = SessionLocal()
        try:
            db.query(Message).filter(Message.key == self._session_key(session_id)).delete()
            row = db.query(Setting).filter(Setting.key == SESSION_INDEX_SETTING_KEY).first()
            if row and isinstance(row.value, dict):
                data = dict(row.value)  # copy to trigger SQLAlchemy mutation tracking
                for proj in list(data.keys()):
                    data[proj] = [s for s in data[proj] if s["id"] != session_id]
                    if not data[proj]:
                        del data[proj]
                row.value = data
                flag_modified(row, "value")
                db.commit()
        finally:
            db.close()

    def get_session_messages(self, session_id: str) -> list[dict]:
        return self.get_history(self._session_key(session_id))

    def add_session_message(self, session_id: str, role: str, content: str):
        self.add(self._session_key(session_id), role, content)
        # Update timestamp
        db = SessionLocal()
        try:
            row = db.query(Setting).filter(Setting.key == SESSION_INDEX_SETTING_KEY).first()
            if row and isinstance(row.value, dict):
                for proj_sessions in row.value.values():
                    for s in proj_sessions:
                        if s["id"] == session_id:
                            s["updated_at"] = datetime.now(timezone.utc).isoformat()
                            row.value = row.value  # trigger update
                            db.commit()
                            return
        finally:
            db.close()


# Singleton — initialized in startup/lifespan
memory_service = MemoryService()

# Migrate legacy JSON si existe
def _init_memory():
    try:
        db = SessionLocal()
        memory_service._maybe_migrate_from_json(db)
    except Exception as e:
        logger.warning("Memory migration skipped: %s", e)
    finally:
        db.close()


_init_memory()
