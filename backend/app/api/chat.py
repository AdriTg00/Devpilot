from fastapi import APIRouter
from fastapi.responses import JSONResponse, StreamingResponse

from app.models.chat import (
    ChatRequest,
    ChatResponse,
    CreateSessionRequest,
    RenameSessionRequest,
    SessionEntry,
    SessionMessage,
    ToolChatRequest,
)
from app.services.llm_service import get_llm_service
from app.services.memory_service import memory_service
from app.tools.tool_definitions import TOOLS

router = APIRouter(tags=["chat"])

_CASUAL_KEY = "_casual"

_CHAT_SYSTEM_PROMPT = (
    "You are DevPilot AI, an expert software development assistant.\n"
    "Help the user with code, architecture, debugging, and development questions.\n"
    "Guidelines:\n"
    "- Respond naturally in the same language the user uses.\n"
    "- Format code with markdown code blocks using the appropriate language tag.\n"
    "- Be concise but thorough. Explain your reasoning.\n"
    "- If unsure, say so rather than inventing answers.\n"
    "- Structure long responses with headings, lists, and code blocks for readability.\n"
    "- When suggesting code changes, show the relevant code and explain what needs to change.\n"
    "- Don't invent APIs, functions, file paths, or project structure.\n"
    "- Use the conversation history to maintain context across messages."
)


def _build_user_prompt(message: str, session_id: str | None = None, project_path: str | None = None) -> str:
    if session_id:
        history = memory_service.build_context(memory_service._session_key(session_id))
    elif project_path:
        history = memory_service.build_context(project_path)
    else:
        history = memory_service.build_context(_CASUAL_KEY)
    if history:
        return f"Historial de la conversacion:\n{history}\n\nMensaje actual: {message}"
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
    answer = get_llm_service().ask_with_system(_CHAT_SYSTEM_PROMPT, user)
    _save_messages(request.session_id, request.message, answer)
    return ChatResponse(response=answer)


@router.post("/chat-stream")
def chat_stream(request: ChatRequest):
    user = _build_user_prompt(request.message, request.session_id)
    stream = get_llm_service().ask_with_system_stream(_CHAT_SYSTEM_PROMPT, user)

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
def clear_chat_memory():
    memory_service.clear(_CASUAL_KEY)
    return {"message": "Chat memory cleared"}


# --- Session endpoints ---

@router.get("/chat/sessions", response_model=list[SessionEntry])
def list_sessions(project: str = _CASUAL_KEY):
    return memory_service.list_sessions(project)


@router.post("/chat/sessions", response_model=SessionEntry)
def create_session(request: CreateSessionRequest):
    return memory_service.create_session(request.project, request.name)


@router.delete("/chat/sessions/{session_id}")
def delete_session(session_id: str):
    memory_service.delete_session(session_id)
    return {"deleted": True}


@router.put("/chat/sessions/{session_id}", response_model=SessionEntry)
def rename_session(session_id: str, request: RenameSessionRequest):
    result = memory_service.rename_session(session_id, request.name)
    if result:
        return result
    return JSONResponse(status_code=404, content={"error": "Session not found"})


@router.get("/chat/sessions/{session_id}/history", response_model=list[SessionMessage])
def get_session_history(session_id: str):
    return memory_service.get_session_messages(session_id)


# --- Tool-calling chat ---

_TOOL_SYSTEM_PROMPT = (
    "You are DevPilot AI, an expert software development assistant with full project access.\n"
    "You have tools available to read files, search code, and explore the project structure.\n"
    "Guidelines:\n"
    "- Respond naturally in the same language the user uses.\n"
    "- When the user asks about their code, USE YOUR TOOLS to read files and search before answering.\n"
    "- Format code with markdown code blocks using the appropriate language tag.\n"
    "- Be concise but thorough. Explain your reasoning.\n"
    "- Don't invent file paths, content, or function signatures. Verify by reading files.\n"
    "- Structure long responses with headings, lists, and code blocks.\n"
    "- If a tool returns an error, inform the user and suggest alternatives.\n"
    "- Use the conversation history to maintain context across messages."
)


@router.post("/chat/tool-stream")
def chat_tool_stream(request: ToolChatRequest):
    llm = get_llm_service()

    # Build user prompt with conversation history
    user_prompt = _build_user_prompt(request.message, request.session_id, request.project_path)

    # If the provider doesn't support tool calling, use regular stream with project context
    if not llm.provider.supports_tools:
        system = _CHAT_SYSTEM_PROMPT
        if request.project_path:
            system += f"\n\nThe user's current project is at: {request.project_path}"
        stream = llm.ask_with_system_stream(system, user_prompt)
        def generate():
            full = ""
            for chunk in stream:
                full += chunk
                yield chunk
            if request.session_id:
                memory_service.add_session_message(request.session_id, "user", request.message)
                memory_service.add_session_message(request.session_id, "assistant", full)
            elif request.project_path:
                memory_service.add(request.project_path, "user", request.message)
                memory_service.add(request.project_path, "assistant", full)
            else:
                memory_service.add(_CASUAL_KEY, "user", request.message)
                memory_service.add(_CASUAL_KEY, "assistant", full)
        return StreamingResponse(
            generate(),
            media_type="text/plain",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    system = _TOOL_SYSTEM_PROMPT
    if request.project_path:
        system += f"\n\nProyecto activo: {request.project_path}"

    stream = llm.ask_with_system_tools_stream(system, user_prompt, TOOLS)

    def generate():
        full = ""
        for chunk in stream:
            if not chunk.startswith("__TOOL__"):
                full += chunk
            yield chunk
        if request.session_id:
            memory_service.add_session_message(request.session_id, "user", request.message)
            memory_service.add_session_message(request.session_id, "assistant", full)
        elif request.project_path:
            memory_service.add(request.project_path, "user", request.message)
            memory_service.add(request.project_path, "assistant", full)
        else:
            memory_service.add(_CASUAL_KEY, "user", request.message)
            memory_service.add(_CASUAL_KEY, "assistant", full)

    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
