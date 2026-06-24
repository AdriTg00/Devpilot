from fastapi import FastAPI
from app.api.chat import router as chat_router
from app.api.projects import (
    router as project_router
)



app = FastAPI(title="DevPilot AI")

app.include_router(chat_router)
app.include_router(project_router)