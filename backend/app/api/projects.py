import logging
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.models.project import (
    ProjectRequest,
    ProjectResponse,
    FileRequest,
    FileContentResponse,
    ProjectQuestionRequest,
    ReadmeResponse,
    RAGStatusResponse,
    RAGReindexRequest,
    RAGClearRequest,
    UploadRequest,
    CloseRequest,
    SearchRequest,
    SearchResponse,
    SearchMatch,
)
from app.services.project_service import ProjectService
from app.services.code_explainer_service import CodeExplainerService
from app.services.memory_service import memory_service
from app.services.rag_service import rag_service
from app.core.validators import validate_directory, validate_file_path

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/project", tags=["project"])

service = ProjectService()
explainer = CodeExplainerService()

UPLOAD_DIR = Path("temp_uploads")


@router.post("/upload")
def upload_project(request: UploadRequest):
    workspace_id = str(uuid.uuid4())[:8]
    base = UPLOAD_DIR / f"{request.name}-{workspace_id}"
    base.mkdir(parents=True, exist_ok=True)

    written = 0
    for rel_path, content in request.files.items():
        file_path = base / rel_path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content, encoding="utf-8")
        written += 1

    workspace_path = str(base.resolve())
    analysis = service.analyze_project(workspace_path)
    files = service.get_files(workspace_path)
    rag_service.index_project(workspace_path, [f["path"] for f in files])

    return {
        "workspace_path": workspace_path,
        "analysis": analysis,
        "files": files,
        "files_written": written,
    }


@router.post("/close")
def close_project(request: CloseRequest):
    path = Path(request.path).resolve()
    rag_service.clear_project(str(path))
    memory_service.clear(str(path))
    if path.exists():
        shutil.rmtree(path)
    return {"closed": True}


@router.post("/search", response_model=SearchResponse)
def search_project(request: SearchRequest):
    validate_directory(request.path)
    from app.tools.directory_reader import list_files

    files = list_files(request.path)
    MAX_MATCHES = 100
    matches: list[dict] = []
    query = request.query if request.case_sensitive else request.query.lower()

    for filepath in files:
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                for line_no, line in enumerate(f, 1):
                    content = line if request.case_sensitive else line.lower()
                    if query in content:
                        matches.append({
                            "path": filepath,
                            "line": line_no,
                            "content": line.rstrip("\n\r"),
                        })
                        if len(matches) >= MAX_MATCHES:
                            return SearchResponse(
                                matches=matches,
                                total=len(matches),
                                truncated=True,
                            )
        except Exception:
            continue

    return SearchResponse(matches=matches, total=len(matches), truncated=False)


@router.post("/files")
def get_files(request: ProjectRequest):
    validate_directory(request.path)

    files = service.get_files(request.path)

    logger.debug("Files found: %d", len(files))

    return {"files": files}


@router.post("/analyze")
def analyze_project(request: ProjectRequest):
    validate_directory(request.path)
    result = service.analyze_project(request.path)
    files = service.get_files(request.path)
    rag_service.index_project(request.path, [f["path"] for f in files])
    return result


@router.post("/summary")
def project_summary(request: ProjectRequest):
    validate_directory(request.path)
    return StreamingResponse(
        service.summarize_project_stream(request.path, request.language),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/explain-file")
def explain_file(request: ProjectRequest):
    validate_file_path(request.path)

    return StreamingResponse(
        explainer.explain_file_stream(request.path, request.language),
        media_type="text/plain",
    )


@router.post("/explain-project")
def explain_project(request: ProjectRequest):
    validate_directory(request.path)
    return StreamingResponse(
        explainer.explain_project_stream(request.path, request.language),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/question")
def ask_project_question(request: ProjectQuestionRequest):
    validate_directory(request.path)
    history = memory_service.build_context(request.path)
    rag_context = rag_service.search(request.question, request.path)
    answer = explainer.answer_question(request.path, request.question, request.language, history, rag_context)
    memory_service.add(request.path, "user", request.question)
    memory_service.add(request.path, "assistant", answer)
    return {"answer": answer}


@router.post("/question-stream")
def ask_project_question_stream(request: ProjectQuestionRequest):
    validate_directory(request.path)
    history = memory_service.build_context(request.path)
    rag_context = rag_service.search(request.question, request.path)

    def stream_and_save():
        full = ""
        for chunk in explainer.answer_question_stream(request.path, request.question, request.language, history, rag_context):
            full += chunk
            yield chunk
        memory_service.add(request.path, "user", request.question)
        memory_service.add(request.path, "assistant", full)

    return StreamingResponse(
        stream_and_save(),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/documentation")
def generate_documentation(request: ProjectRequest):
    validate_directory(request.path)
    return StreamingResponse(
        explainer.generate_documentation_stream(request.path, request.language),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/readme", response_model=ReadmeResponse)
def generate_readme(request: ProjectRequest):
    validate_directory(request.path)
    result = explainer.generate_readme(request.path, request.language)
    return ReadmeResponse(**result)


@router.post("/read-file", response_model=FileContentResponse)
def read_file(request: FileRequest):
    validate_file_path(request.path)
    return service.get_file_content(request.path)


@router.get("/rag-status", response_model=RAGStatusResponse)
def get_rag_status(path: str | None = None):
    return RAGStatusResponse(**rag_service.status(project=path))


@router.post("/rag-reindex")
def reindex_project(request: RAGReindexRequest):
    validate_directory(request.path)
    files = request.files or [f["path"] for f in service.get_files(request.path)]
    rag_service.index_project(request.path, files)
    return {"message": f"Reindexed {len(files)} files for {request.path}", "files": len(files)}


@router.delete("/rag-clear")
def clear_rag_index(request: RAGClearRequest):
    validate_directory(request.path)
    rag_service.clear_project(request.path)
    return {"message": f"Cleared RAG index for {request.path}"}
