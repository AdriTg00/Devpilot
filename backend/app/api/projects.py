import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.models.project import (
    ProjectRequest,
    ProjectResponse,
    FileRequest,
    FileContentResponse,
    ProjectQuestionRequest,
    ReadmeResponse,
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
