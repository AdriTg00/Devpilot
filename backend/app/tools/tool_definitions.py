import json
from pathlib import Path

from app.services.plugin_registry import (
    execute_tool as _execute_tool,
)
from app.services.plugin_registry import (
    get_tool_definitions as _get_tool_definitions,
)
from app.services.plugin_registry import (
    register_tool as _register_tool,
)

_FILE_READ_PARAMS = {
    "type": "object",
    "properties": {
        "path": {
            "type": "string",
            "description": "Ruta absoluta al archivo que se quiere leer",
        }
    },
    "required": ["path"],
}

_LIST_FILES_PARAMS = {
    "type": "object",
    "properties": {
        "path": {
            "type": "string",
            "description": "Ruta del directorio a listar (absoluta o relativa al proyecto)",
        }
    },
    "required": ["path"],
}

_SEARCH_CODE_PARAMS = {
    "type": "object",
    "properties": {
        "query": {
            "type": "string",
            "description": "Texto a buscar (case-insensitive)",
        },
        "path": {
            "type": "string",
            "description": "Ruta del proyecto",
        },
    },
    "required": ["query", "path"],
}

_STRUCTURE_PARAMS = {
    "type": "object",
    "properties": {
        "path": {
            "type": "string",
            "description": "Ruta del proyecto",
        }
    },
    "required": ["path"],
}


def _register_builtin_tools():
    """Register all built-in tools with the plugin registry."""
    _register_tool(
        name="read_file",
        description="Lee el contenido completo de un archivo del proyecto. Útil cuando necesitas ver el código fuente.",
        handler=_read_file,
        parameters=_FILE_READ_PARAMS,
    )
    _register_tool(
        name="list_files",
        description="Lista los archivos del proyecto activo. Devuelve rutas relativas. Útil para explorar la estructura del proyecto.",
        handler=_list_files,
        parameters=_LIST_FILES_PARAMS,
    )
    _register_tool(
        name="search_code",
        description="Busca texto en los archivos del proyecto. Similar a grep. Devuelve archivo, línea y contenido.",
        handler=_search_code,
        parameters=_SEARCH_CODE_PARAMS,
    )
    _register_tool(
        name="get_project_structure",
        description="Obtiene el árbol de directorios del proyecto (solo estructura, sin contenido de archivos).",
        handler=_get_project_structure,
        parameters=_STRUCTURE_PARAMS,
    )


def get_tools() -> list[dict]:
    return _get_tool_definitions()


def execute_tool(name: str, args: dict) -> str:
    try:
        return _execute_tool(name, args)
    except Exception as e:
        return json.dumps({"error": str(e)})


def _read_file(path: str) -> str:
    p = Path(path)
    if not p.exists():
        return f"Error: File not found: {path}"
    try:
        content = p.read_text(encoding="utf-8", errors="ignore")
        return content
    except Exception as e:
        return f"Error: Could not read file: {e}"


def _list_files(path: str) -> str:
    from app.tools.directory_reader import list_files as _list

    p = Path(path)
    if not p.exists() or not p.is_dir():
        return f"Error: Directory not found: {path}"

    try:
        files = _list(str(p.resolve()))
        rels = sorted(str(Path(f).relative_to(p)) for f in files)
        return "\n".join(rels)
    except Exception as e:
        return f"Error: Could not list files: {e}"


def _search_code(query: str, path: str) -> str:
    p = Path(path)
    if not p.exists():
        return f"Error: Project path not found: {path}"

    from app.tools.directory_reader import list_files as _list

    files = _list(str(p.resolve()))
    q = query.lower()
    matches = []
    for fpath in files:
        try:
            with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                for line_no, line in enumerate(f, 1):
                    if q in line.lower():
                        matches.append(f"{Path(fpath).relative_to(p)}:{line_no}: {line.rstrip()}")
                        if len(matches) >= 20:
                            break
        except Exception:
            continue
        if len(matches) >= 20:
            break

    return "\n".join(matches) if matches else "No matches found"


def _get_project_structure(path: str) -> str:
    from app.tools.directory_reader import list_files as _list

    p = Path(path)
    if not p.exists():
        return f"Error: Project path not found: {path}"

    try:
        files = _list(str(p.resolve()))
        tree = sorted(str(Path(f).relative_to(p)) for f in files)
        return "\n".join(tree)
    except Exception as e:
        return f"Error: Could not get structure: {e}"


_register_builtin_tools()
