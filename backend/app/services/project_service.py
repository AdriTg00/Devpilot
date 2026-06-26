import logging

from app.tools.directory_reader import list_files
from app.tools.file_reader import read_file
from app.tools.code_analyzer import analyze_python_file
from app.services.llm_service import get_llm_service
from pathlib import Path

logger = logging.getLogger(__name__)


class ProjectService:

    def __init__(self):
        self.llm = get_llm_service()

    def get_files(self, path: str) -> list[dict]:
        files = list_files(path)

        return [
            {
                "path": file,
                "name": Path(file).name,
            }
            for file in files
        ]

    def analyze_project(self, path: str) -> dict:
        files = list_files(path)

        python_files = 0
        total_lines = 0
        total_functions = 0
        total_classes = 0

        for file in files:
            if not file.endswith(".py"):
                continue
            python_files += 1
            try:
                content = read_file(file)
                stats = analyze_python_file(content)
                total_lines += stats["lines"]
                total_functions += stats["functions"]
                total_classes += stats["classes"]
            except Exception as e:
                logger.warning(f"No se pudo analizar el archivo {file}: {e}")

        return {
            "python_files": python_files,
            "lines": total_lines,
            "functions": total_functions,
            "classes": total_classes,
        }

    def summarize_project(self, path: str) -> str:
        stats = self.analyze_project(path)
        return self.llm.summarize_project(stats)

    def get_file_content(self, path: str):
        content = read_file(path)

        return {
            "path": path,
            "content": content,
        }
