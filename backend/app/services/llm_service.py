import logging
import ollama

from app.core.config import OLLAMA_MODEL
from app.core.prompts import SUMMARIZE_PROJECT_PROMPT

logger = logging.getLogger(__name__)


class LLMService:

    def __init__(self):
        self.model = OLLAMA_MODEL
        self._resolve_model()

    def _resolve_model(self):
        """Resuelve el modelo disponible en Ollama mas cercano al configurado."""
        try:
            available = ollama.list()
            models = [m.get("model") or m.get("name") for m in available.get("models", [])]
            if models and self.model not in models:
                # Buscar por prefijo exacto (ej. "qwen2.5-coder" en "qwen2.5-coder:7b")
                prefix = self.model.split(":")[0]
                matching = [m for m in models if m.startswith(prefix)]
                if matching:
                    self.model = matching[-1]
                    logger.info(
                        f"Modelo '{OLLAMA_MODEL}' no encontrado. "
                        f"Usando version disponible: {self.model}"
                    )
                else:
                    self.model = models[0]
                    logger.warning(
                        f"No se encontro ningun modelo compatible con '{prefix}'. "
                        f"Usando el primero disponible: {self.model}"
                    )
        except Exception as e:
            logger.warning(
                f"No se pudo contactar con Ollama al inicializar: {e}. "
                f"Usando modelo por defecto: {self.model}"
            )

    def ask(self, prompt: str) -> str:
        try:
            response = ollama.chat(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
            )
            return response["message"]["content"]
        except Exception as e:
            logger.error(f"Error al llamar al LLM ({self.model}): {e}")
            raise

    def summarize_project(self, stats: dict) -> str:
        prompt = SUMMARIZE_PROJECT_PROMPT.format(
            python_files=stats["python_files"],
            lines=stats["lines"],
            functions=stats["functions"],
            classes=stats["classes"],
        )
        return self.ask(prompt)


# Singleton: una unica instancia de LLMService compartida entre todos los servicios.
# Evita multiples llamadas a ollama.list() en el arranque de la aplicacion.
_llm_instance = None


def get_llm_service() -> LLMService:
    """Devuelve la instancia singleton de LLMService."""
    global _llm_instance
    if _llm_instance is None:
        _llm_instance = LLMService()
    return _llm_instance
