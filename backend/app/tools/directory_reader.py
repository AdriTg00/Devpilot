from pathlib import Path

IGNORE_DIRS = {
    ".venv", "venv", "__pycache__", ".git", "site-packages", "node_modules",
    "dist", "build", ".next", ".nuxt", "out", ".output",
    "target", "bin", "obj", "vendor",
    ".vscode", ".idea", ".vs",
    "coverage", ".nyc_output",
    ".tox", ".eggs", "eggs",
    ".mypy_cache", ".pytest_cache", ".ruff_cache",
    ".sass-cache", ".parcel-cache",
    ".turbo", ".vercel",
    "Pods", ".build",
}

ALLOWED_EXTENSIONS = {
    ".py", ".ts", ".tsx", ".js", ".jsx",
    ".html", ".css", ".md", ".txt", ".json", ".yaml", ".yml",
    ".c", ".cpp", ".cc", ".cxx", ".h", ".hpp", ".hh", ".hxx",
    ".java", ".cs", ".go", ".rs", ".php", ".rb", ".swift",
    ".kt", ".kts", ".scala", ".dart",
    ".r", ".R", ".lua", ".groovy", ".sh", ".bash", ".ps1",
    ".sql", ".graphql", ".proto", ".xml", ".toml",
}


def list_files(path: str):

    files = []

    for file in Path(path).rglob("*"):

        if not file.is_file():
            continue

        if any(part in IGNORE_DIRS for part in file.parts):
            continue

        if file.suffix.lower() not in ALLOWED_EXTENSIONS:
            continue

        files.append(str(file))

    return files
