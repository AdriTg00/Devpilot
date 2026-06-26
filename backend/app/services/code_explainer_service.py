import logging
from pathlib import Path

from app.services.llm_service import get_llm_service
from app.tools.file_reader import read_file
from app.tools.directory_reader import list_files
from app.tools.file_writer import write_file
from app.core.prompts import (
    README_PROMPT,
    ANSWER_QUESTION_PROMPT,
    EXPLAIN_PROJECT_PROMPT,
    EXPLAIN_FILE_PROMPT,
)

logger = logging.getLogger(__name__)


class CodeExplainerService:

    def __init__(self):
        self.llm = get_llm_service()

    def _build_context(
        self, path: str, max_chars: int = 1000, max_total: int = 10000
    ) -> tuple[str, str]:
        """Construye el contexto de codigo para los prompts del LLM.

        Returns:
            tuple: (project_name, context_string)
        """
        files = list_files(path)
        project_name = Path(path).name
        context = ""

        for file in files:
            if not file.endswith(".py"):
                continue
            try:
                content = read_file(file)
                context += f"\nARCHIVO:\n{file}\n\nCODIGO:\n{content[:max_chars]}\n"
            except Exception as e:
                logger.warning(f"No se pudo leer el archivo {file}: {e}")
                continue
            if len(context) > max_total:
                break

        return project_name, context

    def generate_readme(self, project_path: str) -> dict:
        documentation = self.generate_documentation(project_path)
        readme_path = Path(project_path) / "README.md"
        already_existed = readme_path.exists()
        write_file(str(readme_path), documentation)
        return {"readme_path": str(readme_path), "already_existed": already_existed}

    def generate_documentation(self, project_path: str) -> str:
        project_name, context = self._build_context(
            project_path, max_chars=1000, max_total=10000
        )
        prompt = README_PROMPT.format(project_name=project_name, context=context)
        return self.llm.ask(prompt)

    def answer_question(self, project_path: str, question: str) -> str:
        project_name, context = self._build_context(
            project_path, max_chars=1000, max_total=8000
        )
        prompt = ANSWER_QUESTION_PROMPT.format(
            project_name=project_name,
            context=context,
            question=question,
        )
        return self.llm.ask(prompt)

    def explain_project(self, path: str) -> str:
        _, project_content = self._build_context(path, max_chars=3000, max_total=15000)
        prompt = EXPLAIN_PROJECT_PROMPT.format(project_content=project_content)
        return self.llm.ask(prompt)

    def explain_file(self, path: str) -> str:
        """Explica el contenido de un unico archivo de codigo."""
        try:
            content = read_file(path)
        except Exception as e:
            logger.error(f"No se pudo leer el archivo {path}: {e}")
            raise
        file_name = Path(path).name
        prompt = EXPLAIN_FILE_PROMPT.format(file_name=file_name, content=content[:5000])
        return self.llm.ask(prompt)
