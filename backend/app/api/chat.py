from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.chat import (
    ChatRequest,
    ChatResponse,
    CreateSessionRequest,
    RenameSessionRequest,
    SessionEntry,
    SessionMessage,
    SessionSearchResult,
    ToolChatRequest,
)
from app.services.llm_service import get_llm_service
from app.services.memory_service import memory_service
from app.services.prompts_service import get_prompt
from app.services.rag_service import rag_service
from app.tools.tool_definitions import TOOLS

router = APIRouter(tags=["chat"])

_CASUAL_KEY = "_casual"


def _build_user_prompt(message: str, session_id: str | None = None, project_path: str | None = None) -> str:
    if session_id:
        history = memory_service.build_context(memory_service._session_key(session_id))
    elif project_path:
        history = memory_service.build_context(project_path)
    else:
        history = memory_service.build_context(_CASUAL_KEY)
    if history:
        return f"Conversation history:\n{history}\n\nCurrent message: {message}"
    return message


def _save_messages(session_id: str | None, user_msg: str, assistant_msg: str):
    if session_id:
        memory_service.add_session_message(session_id, "user", user_msg)
        memory_service.add_session_message(session_id, "assistant", assistant_msg)
    else:
        memory_service.add(_CASUAL_KEY, "user", user_msg)
        memory_service.add(_CASUAL_KEY, "assistant", assistant_msg)


# --- Legacy endpoints (backward compatible) ---

@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    user = _build_user_prompt(request.message, request.session_id)
    system_prompt = get_prompt("chat_system")
    answer = get_llm_service().ask_with_system(system_prompt, user)
    _save_messages(request.session_id, request.message, answer)
    return ChatResponse(response=answer)


@router.post("/chat-stream")
def chat_stream(request: ChatRequest):
    user = _build_user_prompt(request.message, request.session_id)
    system_prompt = get_prompt("chat_system")
    stream = get_llm_service().ask_with_system_stream(system_prompt, user)

    def generate():
        full = ""
        for chunk in stream:
            full += chunk
            yield chunk
        _save_messages(request.session_id, request.message, full)

    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/chat-clear")
def clear_chat_memory(db: Session = Depends(get_db)):
    memory_service.clear(_CASUAL_KEY, db=db)
    return {"message": "Chat memory cleared"}


# --- Session endpoints ---

@router.get("/chat/sessions", response_model=list[SessionEntry])
def list_sessions(project: str = _CASUAL_KEY, db: Session = Depends(get_db)):
    return memory_service.list_sessions(project, db=db)


@router.post("/chat/sessions", response_model=SessionEntry)
def create_session(request: CreateSessionRequest, db: Session = Depends(get_db)):
    return memory_service.create_session(request.project, request.name, db=db)


@router.delete("/chat/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db)):
    memory_service.delete_session(session_id, db=db)
    return {"deleted": True}


@router.put("/chat/sessions/{session_id}", response_model=SessionEntry)
def rename_session(session_id: str, request: RenameSessionRequest, db: Session = Depends(get_db)):
    result = memory_service.rename_session(session_id, request.name, db=db)
    if result:
        return result
    return JSONResponse(status_code=404, content={"error": "Session not found"})


@router.get("/chat/sessions/{session_id}/history", response_model=list[SessionMessage])
def get_session_history(session_id: str, db: Session = Depends(get_db)):
    return memory_service.get_session_messages(session_id, db=db)


@router.get("/chat/sessions/search", response_model=list[SessionSearchResult])
def search_sessions(q: str = Query(..., min_length=1), project: str = Query(default="_casual"), db: Session = Depends(get_db)):
    return memory_service.search_sessions(q, project, db=db)


# --- Tool-calling chat ---


def _resolve_project_path(request: ToolChatRequest) -> str | None:
    """Return the project path from the request, or look it up from the session if missing."""
    if request.project_path:
        return request.project_path
    if request.session_id:
        return memory_service.get_session_project(request.session_id)
    return None


def _build_rag_context(message: str, project_path: str | None, session_id: str | None = None) -> str:
    """Query RAG for semantically relevant code snippets using session context."""
    if not project_path:
        return ""
    try:
        queries = [message]
        if session_id:
            recent = memory_service.get_recent_user_messages(session_id, 2)
            queries = recent + queries
        return rag_service.search(queries, project_path) or ""
    except Exception:
        return ""


def _save_turn(session_id: str | None, project_path: str | None, user_msg: str, assistant_msg: str):
    if session_id:
        memory_service.add_session_message(session_id, "user", user_msg)
        memory_service.add_session_message(session_id, "assistant", assistant_msg)
    elif project_path:
        memory_service.add(project_path, "user", user_msg)
        memory_service.add(project_path, "assistant", assistant_msg)
    else:
        memory_service.add(_CASUAL_KEY, "user", user_msg)
        memory_service.add(_CASUAL_KEY, "assistant", assistant_msg)


@router.post("/chat/tool-stream")
def chat_tool_stream(request: ToolChatRequest):
    llm = get_llm_service()

    # Resolve project path — from request or from session metadata
    project_path = _resolve_project_path(request)

    # Retrieve semantically relevant code chunks via RAG (enriched with session history)
    rag_context = _build_rag_context(request.message, project_path, request.session_id)

    # Build user prompt with conversation history
    user_prompt = _build_user_prompt(request.message, request.session_id, project_path)

    # If the provider doesn't support tool calling, use regular stream with project context
    if not llm.provider.supports_tools:
        system = get_prompt("chat_system")
        if project_path:
            system += f"\n\nThe user's current project is at: {project_path}"
        if rag_context:
            system += f"\n\nRelevant code snippets from the project (semantic search):\n{rag_context}"
        stream = llm.ask_with_system_stream(system, user_prompt)

        def generate_no_tools():
            full = ""
            for chunk in stream:
                full += chunk
                yield chunk
            _save_turn(request.session_id, project_path, request.message, full)

        return StreamingResponse(
            generate_no_tools(),
            media_type="text/plain",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    system = get_prompt("tool_system")
    if project_path:
        system += f"\n\nProyecto activo: {project_path}"
    if rag_context:
        system += (
            f"\n\nFragmentos de código relevantes encontrados por búsqueda semántica:\n"
            f"{rag_context}\n"
            f"Usa estos fragmentos como punto de partida. Si necesitas más detalle, "
            f"usa tus herramientas para leer los archivos completos."
        )

    stream = llm.ask_with_system_tools_stream(system, user_prompt, TOOLS)

    def generate():
        full = ""
        for chunk in stream:
            if not chunk.startswith("__TOOL__"):
                full += chunk
            yield chunk
        _save_turn(request.session_id, project_path, request.message, full)

    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
