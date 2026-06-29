"""Tests de autenticacion JWT con SQLite."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.models import Base, User
from app.services.auth_service import create_token, verify_token, authenticate


@pytest.fixture(autouse=True)
def _init_db(monkeypatch, tmp_path):
    """Usa una DB en memoria por test."""
    db_path = tmp_path / "test.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(bind=engine)

    # Crea usuario admin por defecto
    db = TestSession()
    db.add(User(username="admin", password_hash=User.hash_password("admin")))
    db.commit()
    db.close()

    import app.services.auth_service as auth_mod
    import app.services.share_service as share_mod
    import app.services.settings_service as settings_mod

    monkeypatch.setattr(auth_mod, "SessionLocal", TestSession)
    monkeypatch.setattr(share_mod, "SessionLocal", TestSession)
    monkeypatch.setattr(settings_mod, "SessionLocal", TestSession)


class TestToken:
    def test_create_and_verify_token(self):
        token = create_token("admin")
        payload = verify_token(token)
        assert payload is not None
        assert payload["sub"] == "admin"

    def test_verify_invalid_token(self):
        assert verify_token("not.a.real.token") is None

    def test_verify_expired_token(self, monkeypatch):
        import datetime as dt
        import jwt
        import os
        secret = os.getenv("JWT_SECRET", "devpilot-dev-secret-change-in-production")
        past = dt.datetime(2020, 1, 1, tzinfo=dt.timezone.utc)
        payload = {"sub": "admin", "iat": past, "exp": past + dt.timedelta(seconds=1)}
        token = jwt.encode(payload, secret, algorithm="HS256")
        assert verify_token(token) is None


class TestAuthenticate:
    def test_login_valid(self):
        token = authenticate("admin", "admin")
        assert token is not None
        payload = verify_token(token)
        assert payload and payload["sub"] == "admin"

    def test_login_wrong_password(self):
        assert authenticate("admin", "wrong") is None

    def test_login_wrong_username(self):
        assert authenticate("nobody", "admin") is None
