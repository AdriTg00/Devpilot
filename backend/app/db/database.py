"""SQLite database configuration."""
import os
from contextlib import contextmanager
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import MEMORY_STORAGE_PATH

_db_dir = Path(MEMORY_STORAGE_PATH).parent
_db_dir.mkdir(parents=True, exist_ok=True)
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{_db_dir / 'devpilot.db'}")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, echo=False)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db() -> Session:
    """FastAPI dependency injector — yields a session, closes on teardown."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def session_scope(db: Session | None = None):
    """Use provided session or create one. Only commits/closes own sessions.

    - When `db` is provided (from DI): yield it without committing or closing.
    - When `db` is None: create, commit, rollback on error, and close.
    """
    owns = db is None
    s = db or SessionLocal()
    try:
        yield s
        if owns:
            s.commit()
    except Exception:
        if owns:
            s.rollback()
        raise
    finally:
        if owns:
            s.close()


def init_db():
    from app.db.models import Base
    Base.metadata.create_all(bind=engine)


# Create tables on import (before services query them)
init_db()
