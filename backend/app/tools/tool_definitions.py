import json
from pathlib import Path

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Lee el contenido completo de un archivo del proyecto. Útil cuando necesitas ver el código fuente.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Ruta absoluta al archivo que se quiere leer",
                    }
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_files",
            "description": "Lista los archivos del proyecto activo. Devuelve rutas relativas. Útil para explorar la estructura del proyecto.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Ruta del directorio a listar (absoluta o relativa al proyecto)",
                    }
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_code",
            "description": "Busca texto en los archivos del proyecto. Similar a grep. Devuelve archivo, línea y contenido.",
            "parameters": {
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
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_project_structure",
            "description": "Obtiene el árbol de directorios del proyecto (solo estructura, sin contenido de archivos).",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Ruta del proyecto",
                    }
                },
                "required": ["path"],
            },
        },
    },
]


def execute_tool(name: str, args: dict) -> str:
    try:
        if name == "read_file":
            return _read_file(args["path"])
        elif name == "list_files":
            return _list_files(args["path"])
        elif name == "search_code":
            return _search_code(args["query"], args["path"])
        elif name == "get_project_structure":
            return _get_project_structure(args["path"])
        else:
            return json.dumps({"error": f"Unknown tool: {name}"})
    except Exception as e:
        return json.dumps({"error": str(e)})


def _read_file(path: str) -> str:
    p = Path(path)
    if not p.exists():
        return json.dumps({"error": f"File not found: {path}"})
    try:
        content = p.read_text(encoding="utf-8", errors="ignore")
        return json.dumps({"path": path, "content": content, "lines": len(content.splitlines())})
    except Exception as e:
        return json.dumps({"error": f"Could not read file: {e}"})


def _list_files(path: str) -> str:
    from app.tools.directory_reader import list_files as _list

    p = Path(path)
    if not p.exists() or not p.is_dir():
        return json.dumps({"error": f"Directory not found: {path}"})

    try:
        files = _list(str(p.resolve()))
        rels = sorted(str(Path(f).relative_to(p)) for f in files)
        return json.dumps({"files": rels, "count": len(rels)})
    except Exception as e:
        return json.dumps({"error": f"Could not list files: {e}"})


def _search_code(query: str, path: str) -> str:
    p = Path(path)
    if not p.exists():
        return json.dumps({"error": f"Project path not found: {path}"})

    from app.tools.directory_reader import list_files as _list

    files = _list(str(p.resolve()))
    q = query.lower()
    matches = []
    for fpath in files:
        try:
            with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                for line_no, line in enumerate(f, 1):
                    if q in line.lower():
                        matches.append({
                            "file": str(Path(fpath).relative_to(p)),
                            "line": line_no,
                            "content": line.rstrip("\n\r"),
                        })
                        if len(matches) >= 20:
                            break
        except Exception:
            continue
        if len(matches) >= 20:
            break

    return json.dumps({"matches": matches, "total": len(matches)})


def _get_project_structure(path: str) -> str:
    from app.tools.directory_reader import list_files as _list

    p = Path(path)
    if not p.exists():
        return json.dumps({"error": f"Project path not found: {path}"})

    try:
        files = _list(str(p.resolve()))
        tree = sorted(str(Path(f).relative_to(p)) for f in files)
        return json.dumps({"tree": tree, "count": len(tree)})
    except Exception as e:
        return json.dumps({"error": f"Could not get structure: {e}"})
