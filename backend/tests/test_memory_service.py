"""Tests del servicio de memoria con SQLite."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.models import Base


@pytest.fixture
def ms(monkeypatch, tmp_path):
    from app.services.memory_service import MemoryService

    db_path = tmp_path / "test.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(bind=engine)

    import app.db.database as db_mod
    monkeypatch.setattr(db_mod, "SessionLocal", TestSession)

    return MemoryService()


class TestMemoryService:
    def test_add_and_get(self, ms):
        ms.add("proj1", "user", "hello")
        ms.add("proj1", "assistant", "world")

        history = ms.get_history("proj1")
        assert len(history) == 2
        assert history[0] == {"role": "user", "content": "hello"}
        assert history[1] == {"role": "assistant", "content": "world"}

    def test_build_context(self, ms):
        ms.add("proj1", "user", "hello")
        ms.add("proj1", "assistant", "world")

        context = ms.build_context("proj1")
        assert "user: hello" in context
        assert "assistant: world" in context

    def test_max_history(self, ms):
        from app.services.memory_service import MAX_HISTORY_PER_KEY

        for i in range(MAX_HISTORY_PER_KEY + 5):
            ms.add("proj1", "user", f"msg{i}")

        history = ms.get_history("proj1")
        assert len(history) == MAX_HISTORY_PER_KEY

    def test_clear(self, ms):
        ms.add("proj1", "user", "hello")
        ms.clear("proj1")
        assert ms.get_history("proj1") == []

    def test_persistence(self, ms):
        ms.add("proj1", "user", "hello")
        ms.add("proj1", "assistant", "world")

        # Same DB — data persists
        history = ms.get_history("proj1")
        assert len(history) == 2

    def test_empty_context(self, ms):
        assert ms.build_context("nonexistent") == ""

    def test_chars_limit(self, ms):
        long_msg = "x" * 5000
        ms.add("proj1", "user", long_msg)
        context = ms.build_context("proj1")
        assert len(context) < 5000


class TestMemorySessions:
    def test_create_and_list(self, ms):
        s = ms.create_session("test-project", "Mi sesion")
        sessions = ms.list_sessions("test-project")
        assert len(sessions) == 1
        assert sessions[0]["id"] == s["id"]

    def test_delete_session(self, ms):
        s = ms.create_session("test-project", "To delete")
        ms.delete_session(s["id"])
        sessions = ms.list_sessions("test-project")
        assert len(sessions) == 0

    def test_rename_session(self, ms):
        s = ms.create_session("test-project", "Old name")
        updated = ms.rename_session(s["id"], "New name")
        assert updated["name"] == "New name"

    def test_add_and_get_session_messages(self, ms):
        s = ms.create_session("test-project")
        ms.add_session_message(s["id"], "user", "hello")
        msgs = ms.get_session_messages(s["id"])
        assert len(msgs) == 1
        assert msgs[0]["content"] == "hello"
