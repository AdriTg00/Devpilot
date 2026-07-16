import logging

from fastapi import APIRouter

from app.core.validators import validate_directory, validate_file_path
from app.models.project import FileContentResponse, FileRequest
from app.tools.code_analyzer import analyze_file
from app.tools.directory_reader import list_files
from app.tools.file_reader import read_file

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tools", tags=["tools"])


@router.post("/read-file", response_model=FileContentResponse)
def read_file_endpoint(request: FileRequest):
    validate_file_path(request.path)
    content = read_file(request.path)
    return FileContentResponse(path=request.path, content=content)


@router.post("/list-files")
def list_files_endpoint(request: FileRequest):
    validate_directory(request.path)
    files = list_files(request.path)
    return {"path": request.path, "files": files}


class AnalyzeRequest(FileRequest):
    pass


@router.post("/analyze-file")
def analyze_file_endpoint(request: AnalyzeRequest):
    validate_file_path(request.path)
    content = read_file(request.path)
    ext = request.path.rsplit(".", 1)[-1] if "." in request.path else ""
    stats = analyze_file(content, f".{ext}")
    return {"path": request.path, "extension": f".{ext}", "stats": stats}


@router.get("/plugins")
async def list_plugins():
    """List all registered plugins and tools."""
    from app.services.plugin_registry import get_tool_definitions

    tools = get_tool_definitions()
    return {
        "plugins": [
            {
                "name": "builtin",
                "version": "1.0.0",
                "description": "Built-in DevPilot tools",
                "tools": [t["function"]["name"] for t in tools],
            }
        ],
        "tools": tools,
    }
