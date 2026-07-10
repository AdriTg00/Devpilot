"""Share projects service with SQLite."""
import logging
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import BASE_URL
from app.db.database import session_scope
from app.db.models import Share
from app.services.project_service import project_service
from app.tools.directory_reader import list_files

logger = logging.getLogger(__name__)


class ShareService:
    def create_share(self, project_path: str, expiry_days: int = 7, db: Session | None = None) -> dict:
        path = Path(project_path)
        if not path.exists():
            raise ValueError(f"Project path not found: {project_path}")

        analysis = project_service.analyze_project(str(path.resolve()))
        try:
            files = list_files(str(path.resolve()))
            file_tree = sorted(str(Path(f).relative_to(path)) for f in files)
        except Exception as e:
            logger.warning("Could not list files for share: %s", e)
            file_tree = []

        token = secrets.token_urlsafe(16)
        now = datetime.now(timezone.utc)
        expires = now + timedelta(days=expiry_days)

        with session_scope(db) as s:
            entry = Share(
                token=token,
                project_name=path.name,
                project_path=str(path.resolve()),
                analysis=analysis,
                file_tree=file_tree,
                file_count=len(file_tree),
                created_at=now.isoformat(),
                expires_at=expires.isoformat(),
            )
            s.add(entry)
            s.query(Share).filter(Share.expires_at < now.isoformat()).delete()

            url = f"{BASE_URL.rstrip('/')}/shared/{token}"
            return {
                "token": token,
                "url": url,
                "expires_at": entry.expires_at,
                "created_at": entry.created_at,
            }

    def get_share(self, token: str, db: Session | None = None) -> dict | None:
        with session_scope(db) as s:
            now = datetime.now(timezone.utc).isoformat()
            entry = s.query(Share).filter(Share.token == token).first()
            if not entry:
                return None
            if entry.expires_at < now:
                s.delete(entry)
                return None
            return {
                "token": entry.token,
                "project_name": entry.project_name,
                "project_path": entry.project_path,
                "analysis": entry.analysis,
                "file_tree": entry.file_tree,
                "file_count": entry.file_count,
                "created_at": entry.created_at,
                "expires_at": entry.expires_at,
            }

    def list_shares(self, db: Session | None = None) -> list[dict]:
        with session_scope(db) as s:
            now = datetime.now(timezone.utc).isoformat()
            entries = s.query(Share).filter(Share.expires_at >= now).all()
            return [
                {
                    "token": e.token,
                    "project_name": e.project_name,
                    "created_at": e.created_at,
                    "expires_at": e.expires_at,
                }
                for e in entries
            ]


share_service = ShareService()
