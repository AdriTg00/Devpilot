import logging

from fastapi import APIRouter
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
from app.core.validators import validate_directory, validate_file_path

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/project", tags=["project"])

service = ProjectService()
explainer = CodeExplainerService()


@router.post("/files")
def get_files(request: ProjectRequest):
    validate_directory(request.path)

    files = service.get_files(request.path)

    print(files)

    return {"files": files}


@router.post("/analyze")
def analyze_project(request: ProjectRequest):
    validate_directory(request.path)
    return service.analyze_project(request.path)


@router.post("/summary")
def project_summary(request: ProjectRequest):
    validate_directory(request.path)
    return {"summary": service.summarize_project(request.path)}


@router.post("/explain-file")
def explain_file(request: ProjectRequest):
    validate_file_path(request.path)
    explanation = explainer.explain_file(request.path)
    return {"explanation": explanation}


@router.post("/explain-project")
def explain_project(request: ProjectRequest):
    validate_directory(request.path)
    explanation = explainer.explain_project(request.path)
    return {"explanation": explanation}


@router.post("/question")
def ask_project_question(request: ProjectQuestionRequest):
    validate_directory(request.path)
    answer = explainer.answer_question(request.path, request.question)
    return {"answer": answer}


@router.post("/documentation")
def generate_documentation(request: ProjectRequest):
    validate_directory(request.path)
    documentation = explainer.generate_documentation(request.path)
    return {"project": request.path, "documentation": documentation}


@router.post("/readme", response_model=ReadmeResponse)
def generate_readme(request: ProjectRequest):
    validate_directory(request.path)
    result = explainer.generate_readme(request.path)
    return ReadmeResponse(**result)


@router.post("/read-file", response_model=FileContentResponse)
def read_file(request: FileRequest):
    validate_file_path(request.path)
    return service.get_file_content(request.path)
