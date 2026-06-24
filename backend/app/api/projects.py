from fastapi import APIRouter

from app.models.project import (
    ProjectRequest,
    ProjectResponse
)

from app.services.project_service import (
    ProjectService
)

router = APIRouter()

service = ProjectService()

@router.post("/project/files")
def get_files(request: ProjectRequest):

    files = service.get_files(
        request.path
    )

    return ProjectResponse(
        files=files
    )
    
@router.post("/project/analyze")
def analyze_project(request: ProjectRequest):

    result = service.analyze_project(
        request.path
    )

    return result