from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Mensaje para el asistente de IA")
    session_id: str | None = Field(default=None, description="ID de sesion (opcional)")


class ChatResponse(BaseModel):
    response: str


class CreateSessionRequest(BaseModel):
    project: str = Field(default="_casual", description="Clave del proyecto")
    name: str = Field(default="", description="Nombre de la sesion")


class RenameSessionRequest(BaseModel):
    name: str = Field(..., min_length=1, description="Nuevo nombre de la sesion")


class SessionEntry(BaseModel):
    id: str
    name: str
    created_at: str
    updated_at: str


class SessionMessage(BaseModel):
    role: str
    content: str
