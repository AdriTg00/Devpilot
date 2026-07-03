"""
Filesystem path validation utilities.

All paths entering through the API must pass through these validators
before being processed by services.

Security measures:
- Blocks system directories (Windows/Unix).
- Tracks opened projects to prevent destructive operations on arbitrary paths.
- Detects path traversal in uploads.
"""
import logging
import os
from pathlib import Path

from fastapi import HTTPException

logger = logging.getLogger(__name__)

# System directories that must never be accessible.
_SYSTEM_BLOCKED_PARTS = frozenset({
    "Windows", "System32", "System", "SysWOW64",
    "Program Files", "Program Files (x86)",
    "$Recycle.Bin", "ProgramData",
    "etc", "usr", "bin", "sbin", "boot", "dev", "proc", "sys",
    "var", "root", "lib", "lib64",
})

# Upload limits.
MAX_UPLOAD_FILES = 2000
MAX_UPLOAD_FILE_CHARS = 1_000_000  # 1 MB per file (content in JSON).

# Opened projects in memory (registered via validate_directory).
_opened_projects: set[str] = set()


def mark_project_opened(path: str) -> None:
    """Register a project as opened (validated) to allow close/save."""
    _opened_projects.add(str(Path(path).resolve()))


def is_project_opened(path: str) -> bool:
    """Check if a project was opened (analyzed/uploaded) in this session."""
    return str(Path(path).resolve()) in _opened_projects


def _is_system_path(p: Path) -> bool:
    """Heuristic: blocks paths inside system directories.

    Detects both native separators (/ on Unix, \\ on Windows) and
    separators from the other OS — so a Windows path "C:\\Windows\\System32"
    is correctly detected even on Linux.
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
    """Validate the path exists, is a directory, and is NOT a system path.

    Marks the project as opened for subsequent operations.

    Raises:
        HTTPException 403 if the path is in a system directory.
        HTTPException 400 if the path does not exist or is not a directory.
    """
    p = Path(path).resolve()
    if _is_system_path(p):
        logger.warning("Blocked attempt to access system directory: %s", path)
        raise HTTPException(
            status_code=403,
            detail=f"Access to system directories is blocked: {path}",
        )
    if not p.exists():
        logger.warning("Path not found: %s", path)
        raise HTTPException(status_code=400, detail=f"La ruta no existe: {path}")
    if not p.is_dir():
        raise HTTPException(
            status_code=400,
            detail=f"La ruta no es un directorio: {path}",
        )
    mark_project_opened(str(p))
    return str(p)


def validate_file_path(path: str) -> str:
    """Validate the path exists, is a file, and is NOT a system path.

    Raises:
        HTTPException 403 if the path is in a system directory.
        HTTPException 400 if the path does not exist or is not a file.
    """
    p = Path(path.replace("\\", "/")).resolve()
    if _is_system_path(p):
        logger.warning("Blocked attempt to access system file: %s", path)
        raise HTTPException(
            status_code=403,
            detail=f"Access to system files is blocked: {path}",
        )
    if not p.exists():
        logger.warning("File not found: %s", path)
        raise HTTPException(status_code=400, detail=f"El archivo no existe: {path}")
    if not p.is_file():
        raise HTTPException(
            status_code=400,
            detail=f"La ruta no es un archivo: {path}",
        )
    return str(p)


def validate_relative_path(base: str, rel: str) -> str:
    """Validate a relative path does not escape the base (path traversal).

    Raises:
        HTTPException 403 if the relative path escapes the base.
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
    """Ensure a project was opened before operating on it (close/rmtree).

    Raises:
        HTTPException 403 if the project was not registered as opened.
    """
    if not is_project_opened(path):
        logger.warning("Close attempt on unopened project: %s", path)
        raise HTTPException(
            status_code=403,
            detail="Project was not opened. Call /project/analyze or /project/upload first.",
        )
