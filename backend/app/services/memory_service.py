import json
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.db.database import session_scope
from app.db.models import Message, Setting

logger = logging.getLogger(__name__)

MAX_HISTORY_PER_KEY = 20
MAX_HISTORY_CHARS = 4000
SESSION_INDEX_SETTING_KEY = "session_index"


class MemoryService:
    # --- JSON → SQLite migration (one-time) ---

    def _maybe_migrate_from_json(self, db: Session):
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
            return

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

    def add(self, key: str, role: str, content: str, db: Session | None = None):
        with session_scope(db) as s:
            s.add(Message(key=key, role=role, content=content))
            keep_ids = [
                r[0] for r in
                s.query(Message.id)
                .filter(Message.key == key)
                .order_by(Message.id.desc())
                .limit(MAX_HISTORY_PER_KEY)
                .all()
            ]
            if keep_ids:
                s.query(Message).filter(
                    Message.key == key,
                    Message.id.notin_(keep_ids),
                ).delete()

    def get_history(self, key: str, db: Session | None = None) -> list[dict]:
        with session_scope(db) as s:
            rows = (
                s.query(Message)
                .filter(Message.key == key)
                .order_by(Message.id)
                .all()
            )
            return [{"role": r.role, "content": r.content} for r in rows]

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

    def clear(self, key: str, db: Session | None = None):
        with session_scope(db) as s:
            s.query(Message).filter(Message.key == key).delete()

    # --- Session management ---

    def _session_key(self, session_id: str) -> str:
        return f"_session:{session_id}"

    def _load_sessions(self, db: Session, project: str) -> list[dict]:
        row = db.query(Setting).filter(Setting.key == SESSION_INDEX_SETTING_KEY).first()
        if not row or not isinstance(row.value, dict):
            return []
        return row.value.get(project, [])

    def _save_sessions(self, db: Session, project: str, sessions: list[dict]):
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

    def _migrate_project_sessions(self, project: str, db: Session | None = None):
        with session_scope(db) as s:
            sessions = self._load_sessions(s, project)
            safe_name = project.replace("/", "_").replace("\\", "_")
            default_sid = f"default-{safe_name}"
            existing_ids = {sess["id"] for sess in sessions}
            msgs = (
                s.query(Message)
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
                self._save_sessions(s, project, sessions)

    def list_sessions(self, project: str, db: Session | None = None) -> list[dict]:
        with session_scope(db) as s:
            self._migrate_project_sessions(project, db=s)
            return self._load_sessions(s, project)

    def create_session(self, project: str, name: str = "", db: Session | None = None) -> dict:
        with session_scope(db) as s:
            sessions = self._load_sessions(s, project)
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
            self._save_sessions(s, project, sessions)
            return entry

    def get_session_project(self, session_id: str, db: Session | None = None) -> str | None:
        with session_scope(db) as s:
            row = s.query(Setting).filter(Setting.key == SESSION_INDEX_SETTING_KEY).first()
            if not row or not isinstance(row.value, dict):
                return None
            for project, sessions in row.value.items():
                for sess in sessions:
                    if sess.get("id") == session_id:
                        return sess.get("project") or (project if project != "_casual" else None)
            return None

    def rename_session(self, session_id: str, name: str, db: Session | None = None):
        with session_scope(db) as s:
            row = s.query(Setting).filter(Setting.key == SESSION_INDEX_SETTING_KEY).first()
            if not row or not isinstance(row.value, dict):
                return None
            data = dict(row.value)
            for proj_sessions in data.values():
                for sess in proj_sessions:
                    if sess["id"] == session_id:
                        sess["name"] = name
                        sess["updated_at"] = datetime.now(timezone.utc).isoformat()
                        row.value = data
                        flag_modified(row, "value")
                        return sess
            return None

    def delete_session(self, session_id: str, db: Session | None = None):
        with session_scope(db) as s:
            s.query(Message).filter(Message.key == self._session_key(session_id)).delete()
            row = s.query(Setting).filter(Setting.key == SESSION_INDEX_SETTING_KEY).first()
            if row and isinstance(row.value, dict):
                data = dict(row.value)
                for proj in list(data.keys()):
                    data[proj] = [sess for sess in data[proj] if sess["id"] != session_id]
                    if not data[proj]:
                        del data[proj]
                row.value = data
                flag_modified(row, "value")

    def get_session_messages(self, session_id: str, db: Session | None = None) -> list[dict]:
        return self.get_history(self._session_key(session_id), db=db)

    def add_session_message(self, session_id: str, role: str, content: str, db: Session | None = None):
        self.add(self._session_key(session_id), role, content, db=db)
        with session_scope(db) as s:
            row = s.query(Setting).filter(Setting.key == SESSION_INDEX_SETTING_KEY).first()
            if row and isinstance(row.value, dict):
                for proj_sessions in row.value.values():
                    for sess in proj_sessions:
                        if sess["id"] == session_id:
                            sess["updated_at"] = datetime.now(timezone.utc).isoformat()
                            row.value = row.value
                            return


# Singleton — initialized in startup/lifespan
memory_service = MemoryService()

# Migrate legacy JSON si existe
def _init_memory():
    from app.db.database import SessionLocal
    db = None
    try:
        db = SessionLocal()
        memory_service._maybe_migrate_from_json(db)
        db.commit()
    except Exception as e:
        logger.warning("Memory migration skipped: %s", e)
    finally:
        if db is not None:
            db.close()


_init_memory()
