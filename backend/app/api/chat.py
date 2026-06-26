from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.models.chat import ChatRequest, ChatResponse
from app.services.llm_service import get_llm_service

router = APIRouter(tags=["chat"])

_CHAT_SYSTEM_PROMPT = (
    "Eres DevPilot AI, un asistente de desarrollo de software. "
    "Si te saludan o preguntan sobre ti, responde breve y amable (1-2 lineas). "
    "Para cualquier otra pregunta, responde de forma tecnica, directa y sin opiniones personales. "
    "Responde siempre en el mismo idioma en que te hablen."
)


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    answer = get_llm_service().ask_with_system(_CHAT_SYSTEM_PROMPT, request.message)
    return ChatResponse(response=answer)


@router.post("/chat-stream")
def chat_stream(request: ChatRequest):
    return StreamingResponse(
        get_llm_service().ask_with_system_stream(_CHAT_SYSTEM_PROMPT, request.message),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )