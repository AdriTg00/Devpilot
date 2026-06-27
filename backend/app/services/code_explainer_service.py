import logging
import re
from pathlib import Path

from app.services.llm_service import get_llm_service
from app.tools.file_reader import read_file
from app.tools.directory_reader import list_files
from app.tools.file_writer import write_file
from app.core.prompts import (
    README_PROMPT,
    EXPLAIN_PROJECT_PROMPT,
    EXPLAIN_FILE_PROMPT,
    language_instruction,
)

logger = logging.getLogger(__name__)


MAX_FILE_CONTEXT = 1000

# Patrones de mensajes casuales que no necesitan contexto de codigo
_CASUAL_PATTERNS = re.compile(
    r"^(hola|buenas|hey|hello|hi|saludos|que tal|como estas|"
    r"gracias|thank you|thanks|adios|bye|nos vemos|"
    r"quien eres|que eres|que puedes hacer|que haces|"
    r"como te llamas|tu nombre)\b",
    re.IGNORECASE,
)


def _is_casual(question: str) -> bool:
    stripped = question.strip().lower()
    if len(stripped) < 25 and _CASUAL_PATTERNS.match(stripped):
        return True
    return False

_CONTEXT_EXTENSIONS = {
    ".py", ".ts", ".tsx", ".js", ".jsx",
    ".html", ".css", ".json", ".toml",
    ".c", ".cpp", ".cc", ".cxx", ".h", ".hpp", ".hh", ".hxx",
    ".java", ".cs", ".go", ".rs", ".php", ".rb", ".swift",
    ".kt", ".kts", ".scala", ".dart",
}
_MANIFEST_FILES = {"requirements.txt", "Gemfile", "Makefile", "Dockerfile", "docker-compose.yml", "composer.json", "go.mod"}

_explanation_cache: dict[str, str] = {}


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

        # Build a compact directory tree first
        tree_lines = []
        for f in files:
            rel = Path(f).relative_to(path)
            tree_lines.append(str(rel.as_posix()))
        tree = "\n".join(sorted(tree_lines))
        context += f"ESTRUCTURA DEL PROYECTO:\n{tree}\n\n"

        for file in files:
            ext = Path(file).suffix.lower()
            name = Path(file).name
            if ext not in _CONTEXT_EXTENSIONS and name not in _MANIFEST_FILES:
                continue
            try:
                content = read_file(file)
                context += f"--- {file} ---\n{content[:max_chars]}\n"
            except Exception as e:
                logger.warning(f"No se pudo leer el archivo {file}: {e}")
                continue
            if len(context) > max_total:
                break

        return project_name, context

    def generate_readme(self, project_path: str, language: str = "en") -> dict:
        documentation = self.generate_documentation(project_path, language)
        readme_path = Path(project_path) / "README.md"
        already_existed = readme_path.exists()
        write_file(str(readme_path), documentation)
        return {"readme_path": str(readme_path), "already_existed": already_existed}

    def _build_doc_prompt(self, project_path: str, language: str) -> str:
        project_name, context = self._build_context(
            project_path, max_chars=1000, max_total=10000
        )
        return README_PROMPT.format(
            language_instruction=language_instruction(language),
            project_name=project_name,
            context=context,
        )

    def generate_documentation(self, project_path: str, language: str = "en") -> str:
        prompt = self._build_doc_prompt(project_path, language)
        return self.llm.ask(prompt)

    def generate_documentation_stream(self, project_path: str, language: str = "en"):
        prompt = self._build_doc_prompt(project_path, language)
        yield "\n"
        yield from self.llm.ask_stream(prompt)

    def answer_question(self, project_path: str, question: str, language: str = "en", history: str = "", rag_context: str = "") -> str:
        casual = _is_casual(question)
        if casual:
            system = language_instruction(language) + (
                "Eres DevPilot AI. Responde breve y amable. "
                "No incluyas codigo ni instrucciones en tu respuesta."
            )
            user = question
            return self.llm.ask_with_system(system, user)

        project_name, context = self._build_context(
            project_path, max_chars=300, max_total=1500
        )
        system = language_instruction(language)
        system += (
            "Eres un analizador de codigo. Responde la pregunta del usuario "
            "basandote en el contexto de codigo proporcionado.\n\n"
            "Para preguntas sobre el proyecto:\n"
            "- Busca la respuesta en el contexto incluido abajo\n"
            "- Si la pregunta es sobre endpoints o rutas, busca decoradores como @router.get, @router.post, @app.get, @app.post\n"
            "- Si la pregunta es sobre componentes o paginas, busca archivos .tsx o .jsx\n"
            "- Responde solo los datos que encuentres, sin adornos ni analisis extra\n"
            "- Si no hay suficiente informacion, indica brevemente que no encontraste los datos\n\n"
            "No incluyas instrucciones ni reglas en tu respuesta. Responde directamente."
        )
        user = f"Pregunta sobre el proyecto {project_name}: {question}"
        if history:
            user += f"\n\nHistorial de la conversacion:\n{history}"
        if rag_context:
            user += f"\n\nCodigo relevante (de RAG):\n{rag_context}"
        if context.strip():
            user += f"\n\nArchivos del proyecto (para referencia):\n{context}"
        return self.llm.ask_with_system(system, user)

    def answer_question_stream(self, project_path: str, question: str, language: str = "en", history: str = "", rag_context: str = ""):
        casual = _is_casual(question)
        if casual:
            system = language_instruction(language) + (
                "Eres DevPilot AI. Responde breve y amable. "
                "No incluyas codigo ni instrucciones en tu respuesta."
            )
            user = question
            yield "\n"
            yield from self.llm.ask_with_system_stream(system, user)
            return

        project_name, context = self._build_context(
            project_path, max_chars=300, max_total=1500
        )
        system = language_instruction(language)
        system += (
            "Eres un analizador de codigo. Responde la pregunta del usuario "
            "basandote en el contexto de codigo proporcionado.\n\n"
            "Para preguntas sobre el proyecto:\n"
            "- Busca la respuesta en el contexto incluido abajo\n"
            "- Si la pregunta es sobre endpoints o rutas, busca decoradores como @router.get, @router.post, @app.get, @app.post\n"
            "- Si la pregunta es sobre componentes o paginas, busca archivos .tsx o .jsx\n"
            "- Responde solo los datos que encuentres, sin adornos ni analisis extra\n"
            "- Si no hay suficiente informacion, indica brevemente que no encontraste los datos\n\n"
            "No incluyas instrucciones ni reglas en tu respuesta. Responde directamente."
        )
        user = f"Pregunta sobre el proyecto {project_name}: {question}"
        if history:
            user += f"\n\nHistorial de la conversacion:\n{history}"
        if rag_context:
            user += f"\n\nCodigo relevante (de RAG):\n{rag_context}"
        if context.strip():
            user += f"\n\nArchivos del proyecto (para referencia):\n{context}"
        yield "\n"
        yield from self.llm.ask_with_system_stream(system, user)

    def _build_explain_project_prompt(self, path: str, language: str) -> str:
        _, project_content = self._build_context(path, max_chars=3000, max_total=15000)
        return EXPLAIN_PROJECT_PROMPT.format(
            language_instruction=language_instruction(language),
            project_content=project_content,
        )

    def explain_project(self, path: str, language: str = "en") -> str:
        prompt = self._build_explain_project_prompt(path, language)
        return self.llm.ask(prompt)

    def explain_project_stream(self, path: str, language: str = "en"):
        prompt = self._build_explain_project_prompt(path, language)
        yield "\n"
        yield from self.llm.ask_stream(prompt)

    def explain_file(self, path: str, language: str = "en") -> str:
        cache_key = f"{path}:{language}"
        if cache_key in _explanation_cache:
            return _explanation_cache[cache_key]

        content = read_file(path)
        file_name = Path(path).name
        project_name = Path(path).parent.name

        prompt = EXPLAIN_FILE_PROMPT.format(
            language_instruction=language_instruction(language),
            file_name=file_name,
            project_name=project_name,
            content=content[:MAX_FILE_CONTEXT],
        )

        explanation = self.llm.ask(prompt)
        _explanation_cache[cache_key] = explanation

        return explanation

    def explain_file_stream(self, path: str, language: str = "en"):
        cache_key = f"{path}:{language}"
        if cache_key in _explanation_cache:
            yield _explanation_cache[cache_key]
            return

        content = read_file(path)
        file_name = Path(path).name
        project_name = Path(path).parent.name

        prompt = EXPLAIN_FILE_PROMPT.format(
            language_instruction=language_instruction(language),
            file_name=file_name,
            project_name=project_name,
            content=content[:MAX_FILE_CONTEXT],
        )

        full = ""
        for token in self.llm.ask_stream(prompt):
            full += token
            yield token

        _explanation_cache[cache_key] = full
