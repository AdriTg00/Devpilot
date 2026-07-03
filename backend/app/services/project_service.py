import logging
import time
from pathlib import Path

from app.services.llm_service import get_llm_service
from app.tools.code_analyzer import analyze_file
from app.tools.directory_reader import list_files
from app.tools.file_reader import read_file

logger = logging.getLogger(__name__)

_analysis_cache: dict[str, dict] = {}
_analysis_cache_ttl: int = 300  # 5 minutes


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
        now = time.time()
        cached = _analysis_cache.get(path)
        if cached and (now - cached["ts"]) < _analysis_cache_ttl:
            logger.info("Analysis cache hit for %s", path)
            return cached["data"]

        logger.info("Analyzing project: %s", path)
        files = list_files(path)

        by_type: dict[str, dict] = {}
        total_lines = 0
        total_functions = 0
        total_classes = 0
        total_files = 0

        for file in files:
            ext = Path(file).suffix.lower()
            if ext not in (
                ".py", ".ts", ".tsx", ".js", ".jsx",
                ".html", ".css",
                ".c", ".cpp", ".cc", ".cxx", ".h", ".hpp", ".hh", ".hxx",
                ".java", ".cs", ".go", ".rs", ".php", ".rb", ".swift",
                ".kt", ".kts", ".scala", ".dart",
            ):
                continue
            total_files += 1
            try:
                content = read_file(file)
                stats = analyze_file(content, ext)
                total_lines += stats.get("lines", 0)
                total_functions += stats.get("functions", 0)
                total_classes += stats.get("classes", 0) + stats.get("interfaces", 0)

                by_type.setdefault(ext, {"files": 0, "lines": 0, "functions": 0, "classes": 0})
                by_type[ext]["files"] += 1
                by_type[ext]["lines"] += stats.get("lines", 0)
                by_type[ext]["functions"] += stats.get("functions", 0) + stats.get("selectors", 0)
                by_type[ext]["classes"] += stats.get("classes", 0) + stats.get("interfaces", 0)
            except Exception as e:
                logger.warning(f"Could not analyze file {file}: {e}")

        result = {
            "files": total_files,
            "lines": total_lines,
            "functions": total_functions,
            "classes": total_classes,
            "by_type": by_type,
        }
        _analysis_cache[path] = {"data": result, "ts": now}
        logger.info("Analysis cached for %s (%d files)", path, total_files)
        return result

    def summarize_project(self, path: str, language: str = "en") -> str:
        stats = self.analyze_project(path)
        return self.llm.summarize_project(stats, language)

    def summarize_project_stream(self, path: str, language: str = "en"):
        stats = self.analyze_project(path)
        yield "\n"
        yield from self.llm.summarize_project_stream(stats, language)

    def get_file_content(self, path: str):
        content = read_file(path)

        return {
            "path": path,
            "content": content,
        }


project_service = ProjectService()
