"""
Utilidades de validacion de rutas del sistema de ficheros.

Todas las rutas que entran por la API deben pasar por estos validadores
antes de ser procesadas por los servicios.

Medidas de seguridad:
- Bloquea directorios del sistema (Windows/Unix).
- Rastrea proyectos abiertos para evitar operaciones destructivas en rutas arbitrarias.
- Detecta path traversal en uploads.
"""
import logging
import os
from pathlib import Path

from fastapi import HTTPException

logger = logging.getLogger(__name__)

# Directorios del sistema que nunca deben ser accesibles.
_SYSTEM_BLOCKED_PARTS = frozenset({
    "Windows", "System32", "System", "SysWOW64",
    "Program Files", "Program Files (x86)",
    "$Recycle.Bin", "ProgramData",
    "etc", "usr", "bin", "sbin", "boot", "dev", "proc", "sys",
    "var", "root", "lib", "lib64",
})

# Limites para uploads.
MAX_UPLOAD_FILES = 2000
MAX_UPLOAD_FILE_CHARS = 1_000_000  # 1 MB por archivo (contenido en JSON).

# Proyectos abiertos en memoria (registered via validate_directory).
_opened_projects: set[str] = set()


def mark_project_opened(path: str) -> None:
    """Registra un proyecto como abierto (validado) para permettre close/save."""
    _opened_projects.add(str(Path(path).resolve()))


def is_project_opened(path: str) -> bool:
    """Verifica si un proyecto fue abierto (analizado/upload) en esta sesion."""
    return str(Path(path).resolve()) in _opened_projects


def _is_system_path(p: Path) -> bool:
    """Heuristica: bloquea rutas dentro de directorios del sistema.

    Detecta tanto separadores nativos (/ en Unix, \\ en Windows) como
    separadores del otro OS — asi un path Windows "C:\\Windows\\System32"
    se detecta correctamente incluso en Linux.
    """
    try:
        normalized_parts: set[str] = set()
        for part in p.parts:
            normalized_parts.add(part)
            normalized_parts.update(part.split("\\"))
        if normalized_parts & _SYSTEM_BLOCKED_PARTS:
            return True
        if os.name == "nt":
            lower = str(p).lower()
            if "\\windows\\" in lower or "\\program files" in lower:
                return True
    except Exception:
        pass
    return False


def validate_directory(path: str) -> str:
    """Valida que la ruta exista, sea un directorio y NO sea del sistema.

    Marca el proyecto como abierto para operaciones posteriores.

    Raises:
        HTTPException 403 si la ruta esta en un directorio del sistema.
        HTTPException 400 si la ruta no existe o no es un directorio.
    """
    p = Path(path).resolve()
    if _is_system_path(p):
        logger.warning("Blocked attempt to access system directory: %s", path)
        raise HTTPException(
            status_code=403,
            detail=f"Access to system directories is blocked: {path}",
        )
    if not p.exists():
        logger.warning("Ruta no encontrada: %s", path)
        raise HTTPException(status_code=400, detail=f"La ruta no existe: {path}")
    if not p.is_dir():
        raise HTTPException(
            status_code=400,
            detail=f"La ruta no es un directorio: {path}",
        )
    mark_project_opened(str(p))
    return str(p)


def validate_file_path(path: str) -> str:
    """Valida que la ruta exista, sea un archivo y NO este en sistema.

    Raises:
        HTTPException 403 si la ruta esta en un directorio del sistema.
        HTTPException 400 si la ruta no existe o no es un archivo.
    """
    p = Path(path.replace("\\", "/")).resolve()
    if _is_system_path(p):
        logger.warning("Blocked attempt to access system file: %s", path)
        raise HTTPException(
            status_code=403,
            detail=f"Access to system files is blocked: {path}",
        )
    if not p.exists():
        logger.warning("Archivo no encontrado: %s", path)
        raise HTTPException(status_code=400, detail=f"El archivo no existe: {path}")
    if not p.is_file():
        raise HTTPException(
            status_code=400,
            detail=f"La ruta no es un archivo: {path}",
        )
    return str(p)


def validate_relative_path(base: str, rel: str) -> str:
    """Valida que un path relativo no escape del base (path traversal).

    Raises:
        HTTPException 403 si el path relativo escapa del base.
    """
    base_resolved = Path(base).resolve()
    target = (base_resolved / rel).resolve()
    try:
        target.relative_to(base_resolved)
    except ValueError:
        logger.warning("Path traversal detected: base=%s rel=%s target=%s",
                       base_resolved, rel, target)
        raise HTTPException(
            status_code=403,
            detail=f"Path traversal not allowed: {rel}",
        )
    return str(target)


def assert_project_opened(path: str) -> None:
    """Garantiza que un proyecto fue abierto antes de operar sobre el (close/rmtree).

    Raises:
        HTTPException 403 si el proyecto no fue registrado como abierto.
    """
    if not is_project_opened(path):
        logger.warning("Close attempt on unopened project: %s", path)
        raise HTTPException(
            status_code=403,
            detail="Project was not opened. Call /project/analyze or /project/upload first.",
        )
