from fastapi import APIRouter

from app.models.chat import ChatRequest, ChatResponse
from app.services.llm_service import get_llm_service

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    answer = get_llm_service().ask(request.message)
    return ChatResponse(response=answer)