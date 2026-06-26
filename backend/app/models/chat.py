from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Mensaje para el asistente de IA")


class ChatResponse(BaseModel):
    response: str