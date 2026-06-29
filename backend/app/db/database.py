"""Configuracion de base de datos SQLite."""
import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import MEMORY_STORAGE_PATH

_db_dir = Path(MEMORY_STORAGE_PATH).parent
_db_dir.mkdir(parents=True, exist_ok=True)
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{_db_dir / 'devpilot.db'}")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, echo=False)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app.db.models import Base
    Base.metadata.create_all(bind=engine)


# Crear tablas al import (antes de que los servicios las consulten)
init_db()
