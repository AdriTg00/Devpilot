from fastapi import APIRouter

from app.models.project import ProjectRequest, ProjectResponse, ProjectQuestionRequest

from app.services.project_service import ProjectService
from app.services.code_explainer_service import CodeExplainerService

explainer = CodeExplainerService()

router = APIRouter()

service = ProjectService()


@router.post("/project/files")
def get_files(request: ProjectRequest):

    files = service.get_files(request.path)

    return ProjectResponse(files=files)


@router.post("/project/analyze")
def analyze_project(request: ProjectRequest):

    result = service.analyze_project(request.path)

    return result


@router.post("/project/summary")
def project_summary(request: ProjectRequest):

    return {"summary": service.summarize_project(request.path)}


@router.post("/project/explain-file")
def explain_file(request: ProjectRequest):

    explanation = explainer.explain_file(request.path)

    return {"explanation": explanation}


@router.post("/project/explain-project")
def explain_project(request: ProjectRequest):

    explanation = explainer.explain_project(request.path)

    return {"explanation": explanation}


@router.post("/project/question")
def ask_project_question(request: ProjectQuestionRequest):

    answer = explainer.answer_question(request.path, request.question)

    return {"answer": answer}


@router.post("/project/documentation")
def generate_documentation(request: ProjectRequest):

    documentation = explainer.generate_documentation(request.path)

    return {"project": request.path, "documentation": documentation}


@router.post("/project/readme")
def generate_readme(request: ProjectRequest):

    result = explainer.generate_readme(request.path)

    return result
