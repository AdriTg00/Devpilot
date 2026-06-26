"""
Utilidades de validación de rutas del sistema de ficheros.

Todas las rutas que entran por la API deben pasar por estos validadores
antes de ser procesadas por los servicios.
"""
import logging
from pathlib import Path

from fastapi import HTTPException

logger = logging.getLogger(__name__)


def validate_directory(path: str) -> str:
    """Valida que la ruta exista y sea un directorio.

    Raises:
        HTTPException 400 si la ruta no existe o no es un directorio.
    """
    p = Path(path)
    if not p.exists():
        logger.warning(f"Ruta no encontrada: {path}")
        raise HTTPException(status_code=400, detail=f"La ruta no existe: {path}")
    if not p.is_dir():
        raise HTTPException(
            status_code=400,
            detail=f"La ruta no es un directorio: {path}",
        )
    return path


def validate_file_path(path: str) -> str:
    """Valida que la ruta exista y sea un archivo.

    Raises:
        HTTPException 400 si la ruta no existe o no es un archivo.
    """
    p = Path(path)
    if not p.exists():
        logger.warning(f"Archivo no encontrado: {path}")
        raise HTTPException(status_code=400, detail=f"El archivo no existe: {path}")
    if not p.is_file():
        raise HTTPException(
            status_code=400,
            detail=f"La ruta no es un archivo: {path}",
        )
    return path

