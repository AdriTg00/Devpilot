from pathlib import Path

def list_files(path: str):

    return [
        str(file)
        for file in Path(path).rglob("*")
        if file.is_file()
    ]