from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.models.chat import ChatRequest, ChatResponse
from app.services.llm_service import get_llm_service
from app.services.memory_service import memory_service

router = APIRouter(tags=["chat"])

_CASUAL_KEY = "_casual"

_CHAT_SYSTEM_PROMPT = (
    "Eres DevPilot AI, un asistente de desarrollo de software.\n"
    "Si te saludan, responde solo con un saludo breve.\n"
    "Para preguntas tecnicas: responde de forma directa, sin opiniones ni analisis extra.\n"
    "Responde siempre en el mismo idioma en que te hablen.\n"
    "No incluyas instrucciones ni reglas en tu respuesta."
    "No te repitas ni agregues informacion irrelevante."
)


def _build_user_prompt(message: str) -> str:
    history = memory_service.build_context(_CASUAL_KEY)
    if history:
        return f"Historial de la conversacion:\n{history}\n\nMensaje actual: {message}"
    return message


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    user = _build_user_prompt(request.message)
    answer = get_llm_service().ask_with_system(_CHAT_SYSTEM_PROMPT, user)
    memory_service.add(_CASUAL_KEY, "user", request.message)
    memory_service.add(_CASUAL_KEY, "assistant", answer)
    return ChatResponse(response=answer)


@router.post("/chat-stream")
def chat_stream(request: ChatRequest):
    user = _build_user_prompt(request.message)
    stream = get_llm_service().ask_with_system_stream(_CHAT_SYSTEM_PROMPT, user)

    def generate():
        full = ""
        for chunk in stream:
            full += chunk
            yield chunk
        memory_service.add(_CASUAL_KEY, "user", request.message)
        memory_service.add(_CASUAL_KEY, "assistant", full)

    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/chat-clear")
def clear_chat_memory():
    memory_service.clear(_CASUAL_KEY)
    return {"message": "Chat memory cleared"}