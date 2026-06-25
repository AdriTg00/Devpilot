from pathlib import Path

IGNORE_DIRS = {".venv", "venv", "__pycache__", ".git", "site-packages", "node_modules"}

ALLOWED_EXTENSIONS = {".py", ".md", ".txt", ".json", ".yaml", ".yml"}


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
