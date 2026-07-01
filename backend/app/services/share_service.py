"""Servicio de compartir proyectos con SQLite."""
import logging
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.core.config import BASE_URL
from app.db.database import SessionLocal
from app.db.models import Share
from app.services.project_service import project_service
from app.tools.directory_reader import list_files

logger = logging.getLogger(__name__)


def create_share(project_path: str, expiry_days: int = 7) -> dict:
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

    db = SessionLocal()
    try:
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
        db.add(entry)

        # purge expired
        db.query(Share).filter(Share.expires_at < now.isoformat()).delete()

        db.commit()

        url = f"{BASE_URL.rstrip('/')}/shared/{token}"
        return {
            "token": token,
            "url": url,
            "expires_at": entry.expires_at,
            "created_at": entry.created_at,
        }
    finally:
        db.close()


def get_share(token: str) -> dict | None:
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc).isoformat()
        entry = db.query(Share).filter(Share.token == token).first()
        if not entry:
            return None
        if entry.expires_at < now:
            db.delete(entry)
            db.commit()
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
    finally:
        db.close()


def list_shares() -> list[dict]:
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc).isoformat()
        entries = db.query(Share).filter(Share.expires_at >= now).all()
        return [
            {
                "token": e.token,
                "project_name": e.project_name,
                "created_at": e.created_at,
                "expires_at": e.expires_at,
            }
            for e in entries
        ]
    finally:
        db.close()


class _ShareService:
    def create_share(self, project_path: str, expiry_days: int = 7):
        return create_share(project_path, expiry_days)

    def get_share(self, token: str):
        return get_share(token)

    def list_shares(self):
        return list_shares()


share_service = _ShareService()
