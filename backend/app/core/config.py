import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from the backend/ directory before any os.getenv()
_env_path = Path(__file__).parents[2] / ".env"
load_dotenv(_env_path)

# LLM model
OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:7b")

# CORS — allowed origins (comma-separated in .env)
CORS_ORIGINS: list[str] = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176",
).split(",")

# Context limits for the LLM
MAX_FILE_CHARS: int = int(os.getenv("MAX_FILE_CHARS", "1000"))
MAX_CONTEXT_CHARS: int = int(os.getenv("MAX_CONTEXT_CHARS", "10000"))

# Conversational memory persistence
MEMORY_STORAGE_PATH: str = os.getenv("MEMORY_STORAGE_PATH", str(Path(__file__).parents[2] / ".memory" / "conversations.json"))

# Share projects — persistence
SHARES_STORAGE_PATH: str = os.getenv("SHARES_STORAGE_PATH", str(Path(__file__).parents[2] / ".memory" / "shares.json"))

# Base URL for generating share links (override in production)
BASE_URL: str = os.getenv("BASE_URL", "http://localhost:5173")

