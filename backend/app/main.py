import logging

# app.core.config debe importarse antes que cualquier otro modulo de la app
# para garantizar que load_dotenv() se ejecuta y las variables de entorno
# estan disponibles cuando LLMService y otros modulos las leen.
from app.core.config import CORS_ORIGINS

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.chat import router as chat_router
from app.api.projects import router as project_router
from app.api.tools import router as tools_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="DevPilot AI",
    description="Herramientas inteligentes para el desarrollo de software con IA local.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(project_router)
app.include_router(tools_router)