from pathlib import Path


def test_settings_service_defaults(tmp_path: Path):
    from app.services.settings_service import SettingsService

    path = tmp_path / "settings.json"
    svc = SettingsService(storage_path=path)

    settings = svc.get()
    assert settings.provider == "auto"
    assert settings.ollama_model == "qwen2.5-coder:7b"
    assert settings.temperature == 0.2
    assert settings.max_tokens == 4096


def test_settings_service_update(tmp_path: Path):
    from app.services.settings_service import SettingsService

    path = tmp_path / "settings.json"
    svc = SettingsService(storage_path=path)

    updated = svc.update({"temperature": 0.7, "ollama_model": "llama3"})
    assert updated.temperature == 0.7
    assert updated.ollama_model == "llama3"


def test_settings_service_persistence(tmp_path: Path):
    from app.services.settings_service import SettingsService

    path = tmp_path / "settings.json"
    svc1 = SettingsService(storage_path=path)
    svc1.update({"temperature": 0.9, "provider": "ollama"})

    svc2 = SettingsService(storage_path=path)
    settings = svc2.get()
    assert settings.temperature == 0.9
    assert settings.provider == "ollama"


def test_settings_service_no_file(tmp_path: Path):
    from app.services.settings_service import SettingsService

    path = tmp_path / "nonexistent" / "settings.json"
    svc = SettingsService(storage_path=path)

    settings = svc.get()
    assert settings.provider == "auto"


def test_settings_service_invalid_file(tmp_path: Path):
    from app.services.settings_service import SettingsService

    path = tmp_path / "settings.json"
    path.write_text("{invalid", encoding="utf-8")

    svc = SettingsService(storage_path=path)
    settings = svc.get()
    assert settings.temperature == 0.2


def test_settings_service_update_partial(tmp_path: Path):
    from app.services.settings_service import SettingsService

    path = tmp_path / "settings.json"
    svc = SettingsService(storage_path=path)
    svc.update({"temperature": 0.5, "ollama_model": "llama3"})

    svc2 = SettingsService(storage_path=path)
    svc2.update({"temperature": 0.8})

    settings = svc2.get()
    assert settings.temperature == 0.8
    assert settings.ollama_model == "llama3"


def test_settings_service_groq_model(tmp_path: Path):
    from app.services.settings_service import SettingsService

    path = tmp_path / "settings.json"
    svc = SettingsService(storage_path=path)

    svc.update({"groq_model": "balanced"})
    assert svc.get().groq_model == "balanced"


def test_settings_service_max_tokens(tmp_path: Path):
    from app.services.settings_service import SettingsService

    path = tmp_path / "settings.json"
    svc = SettingsService(storage_path=path)

    svc.update({"max_tokens": 8192})
    assert svc.get().max_tokens == 8192
