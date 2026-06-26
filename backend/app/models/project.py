from pydantic import BaseModel, Field


class ProjectRequest(BaseModel):
    path: str = Field(..., min_length=1, description="Ruta al proyecto o archivo")


class ProjectFile(BaseModel):
    path: str
    name: str


class ProjectResponse(BaseModel):
    files: list[ProjectFile]


class ProjectQuestionRequest(BaseModel):
    path: str = Field(..., min_length=1, description="Ruta al proyecto")
    question: str = Field(..., min_length=1, description="Pregunta sobre el proyecto")


class ReadmeResponse(BaseModel):
    readme_path: str
    already_existed: bool


class FileRequest(BaseModel):
    path: str = Field(..., min_length=1, description="Ruta al archivo")


class FileContentResponse(BaseModel):
    path: str
    content: str
