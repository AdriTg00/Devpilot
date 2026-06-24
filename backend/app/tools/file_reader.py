from pathlib import Path

def read_file(path: str):

    return Path(path).read_text(
        encoding="utf-8",
        errors="ignore"
    )