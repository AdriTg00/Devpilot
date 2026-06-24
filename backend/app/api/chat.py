from fastapi import APIRouter

from app.models.chat import (
    ChatRequest,
    ChatResponse
)

from app.services.llm_service import (
    LLMService
)

router = APIRouter()

llm = LLMService()


@router.post("/chat")
def chat(request: ChatRequest):

    answer = llm.ask(request.message)

    return ChatResponse(
        response=answer
    )