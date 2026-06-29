import json
import logging
import secrets
from datetime import datetime, timedelta
from pathlib import Path

from app.core.config import SHARES_STORAGE_PATH, BASE_URL
from app.tools.directory_reader import list_files
from app.services.project_service import project_service

logger = logging.getLogger(__name__)


class ShareService:
    def __init__(self):
        self._store_path = Path(SHARES_STORAGE_PATH)
        self._store_path.parent.mkdir(parents=True, exist_ok=True)
        self._shares: dict[str, dict] = {}
        self._load()

    def _load(self):
        if self._store_path.exists():
            try:
                data = json.loads(self._store_path.read_text("utf-8"))
                self._shares = data
                # purge expired on load
                now = datetime.utcnow().isoformat()
                expired = [k for k, v in self._shares.items() if v.get("expires_at", "") < now]
                for k in expired:
                    del self._shares[k]
                if expired:
                    self._save()
            except Exception as e:
                logger.warning("Failed to load shares: %s", e)

    def _save(self):
        self._store_path.write_text(json.dumps(self._shares, indent=2), "utf-8")

    def create_share(self, project_path: str, expiry_days: int = 7) -> dict:
        path = Path(project_path)
        if not path.exists():
            raise ValueError(f"Project path not found: {project_path}")

        # build snapshot
        analysis = project_service.analyze_project(str(path.resolve()))
        try:
            files = list_files(str(path.resolve()))
            file_tree = sorted(str(Path(f).relative_to(path)) for f in files)
        except Exception as e:
            logger.warning("Could not list files for share: %s", e)
            file_tree = []

        token = secrets.token_urlsafe(16)
        created = datetime.utcnow()
        expires = created + timedelta(days=expiry_days)

        entry = {
            "token": token,
            "project_name": path.name,
            "project_path": str(path.resolve()),
            "analysis": analysis,
            "file_tree": file_tree,
            "file_count": len(file_tree),
            "created_at": created.isoformat(),
            "expires_at": expires.isoformat(),
        }

        self._shares[token] = entry
        self._save()

        url = f"{BASE_URL.rstrip('/')}/shared/{token}"
        return {
            "token": token,
            "url": url,
            "expires_at": entry["expires_at"],
            "created_at": entry["created_at"],
        }

    def get_share(self, token: str) -> dict | None:
        entry = self._shares.get(token)
        if not entry:
            return None
        # check expiry
        if entry.get("expires_at", "") < datetime.utcnow().isoformat():
            del self._shares[token]
            self._save()
            return None
        return entry

    def list_shares(self) -> list[dict]:
        now = datetime.utcnow().isoformat()
        valid = []
        for entry in self._shares.values():
            if entry.get("expires_at", "") >= now:
                valid.append(entry)
        return valid


share_service = ShareService()
