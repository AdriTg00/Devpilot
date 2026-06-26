import os
from pathlib import Path
from dotenv import load_dotenv

# Carga el .env desde el directorio backend/ antes de cualquier os.getenv()
_env_path = Path(__file__).parents[2] / ".env"
load_dotenv(_env_path)

# Modelo LLM
OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:7b")

# CORS — orígenes permitidos (separados por coma en el .env)
CORS_ORIGINS: list[str] = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:5173,http://localhost:4200",
).split(",")

# Límites de contexto para el LLM
MAX_FILE_CHARS: int = int(os.getenv("MAX_FILE_CHARS", "1000"))
MAX_CONTEXT_CHARS: int = int(os.getenv("MAX_CONTEXT_CHARS", "10000"))

