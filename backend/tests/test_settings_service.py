"""Tests del servicio de settings con SQLite."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.models import Base
from app.services.settings_service import SettingsService


@pytest.fixture
def svc(monkeypatch, tmp_path):
    db_path = tmp_path / "test.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(bind=engine)

    import app.services.settings_service as mod
    monkeypatch.setattr(mod, "SessionLocal", TestSession)

    return SettingsService()


class TestDefaults:
    def test_defaults(self, svc):
        s = svc.get()
        assert s.provider == "auto"
        assert s.ollama_model == "qwen2.5-coder:7b"
        assert s.temperature == 0.2
        assert s.max_tokens == 4096
        assert s.rag_chunk_lines == 50
        assert s.rag_overlap_lines == 5

    def test_update_partial(self, svc):
        svc.update({"temperature": 0.8, "max_tokens": 2048})
        s = svc.get()
        assert s.temperature == 0.8
        assert s.max_tokens == 2048
        assert s.provider == "auto"  # unchanged

    def test_update_full(self, svc):
        svc.update({"provider": "ollama", "ollama_model": "llama3:8b", "temperature": 0.5})
        s = svc.get()
        assert s.provider == "ollama"
        assert s.ollama_model == "llama3:8b"
        assert s.temperature == 0.5

    def test_persistence(self, svc, monkeypatch, tmp_path):
        svc.update({"temperature": 0.3})
        # Crear nueva instancia — debe leer del DB
        svc2 = SettingsService()
        s2 = svc2.get()
        assert s2.temperature == 0.3

    def test_unknown_field_ignored(self, svc):
        # Pydantic ignora campos desconocidos por defecto — no deberia crashear
        svc.update({"nonexistent": 123})
        assert svc.get().provider == "auto"

    def test_groq_model(self, svc):
        svc.update({"provider": "groq", "groq_model": "balanced"})
        assert svc.get().groq_model == "balanced"

    def test_rag_config(self, svc):
        svc.update({"rag_chunk_lines": 100, "rag_overlap_lines": 10})
        s = svc.get()
        assert s.rag_chunk_lines == 100
        assert s.rag_overlap_lines == 10
