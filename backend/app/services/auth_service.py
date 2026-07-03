"""JWT authentication service with SQLite."""
import datetime
import logging
import os

import jwt

from app.db.database import SessionLocal
from app.db.models import User

logger = logging.getLogger(__name__)

_SECRET = os.getenv("JWT_SECRET", "devpilot-dev-secret-change-in-production")
_ALGORITHM = "HS256"
_EXPIRE_HOURS = 24


def create_token(username: str) -> str:
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        "sub": username,
        "iat": now,
        "exp": now + datetime.timedelta(hours=_EXPIRE_HOURS),
    }
    return jwt.encode(payload, _SECRET, algorithm=_ALGORITHM)


def verify_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, _SECRET, algorithms=[_ALGORITHM])
    except jwt.PyJWTError:
        return None


def authenticate(username: str, password: str) -> str | None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if user and user.verify_password(password):
            return create_token(username)
        return None
    finally:
        db.close()


def seed_default_user():
    """Create the default admin/admin user if it does not exist."""
    db = SessionLocal()
    try:
        if db.query(User).filter(User.username == "admin").first():
            return
        user = User(username="admin", password_hash=User.hash_password("admin"))
        db.add(user)
        db.commit()
        logger.info("Default user created: admin/admin")
    finally:
        db.close()
