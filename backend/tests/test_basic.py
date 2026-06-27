import pytest
from pathlib import Path
from fastapi import HTTPException


def test_project_service_imports():
    """Verifica que los servicios principales importan sin errores."""
    from app.core.config import CORS_ORIGINS
    from app.services.project_service import ProjectService

    assert isinstance(CORS_ORIGINS, list)
    assert ProjectService is not None


def test_validate_directory(tmp_path: Path):
    """Verifica que validate_directory acepta directorios válidos."""
    from app.core.validators import validate_directory

    d = tmp_path / "test_project"
    d.mkdir()
    validate_directory(str(d))

    with pytest.raises(HTTPException):
        validate_directory(str(tmp_path / "no_existe"))
