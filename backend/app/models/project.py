from pydantic import BaseModel, Field


class ProjectRequest(BaseModel):
    path: str = Field(..., min_length=1, description="Ruta al proyecto o archivo")
    language: str = Field(default="en", description="Idioma: en | es")


class ProjectFile(BaseModel):
    path: str
    name: str


class ProjectResponse(BaseModel):
    files: list[ProjectFile]


class ProjectQuestionRequest(BaseModel):
    path: str = Field(..., min_length=1, description="Ruta al proyecto")
    question: str = Field(..., min_length=1, description="Pregunta sobre el proyecto")
    language: str = Field(default="en", description="Idioma: en | es")


class ReadmeResponse(BaseModel):
    readme_path: str
    already_existed: bool


class FileRequest(BaseModel):
    path: str = Field(..., min_length=1, description="Ruta al archivo")


class SaveFileRequest(BaseModel):
    path: str = Field(..., min_length=1, description="Ruta al archivo")
    content: str = Field(..., description="Nuevo contenido del archivo")


class FileContentResponse(BaseModel):
    path: str
    content: str


class RAGStatusResponse(BaseModel):
    ready: bool
    chroma_dir: str
    chunk_lines: int
    overlap_lines: int
    max_chunks_per_file: int
    max_results: int
    total_chunks: int | None = None
    project_chunks: int | None = None


class RAGReindexRequest(BaseModel):
    path: str = Field(..., min_length=1, description="Ruta al proyecto")

    files: list[str] = Field(default_factory=list, description="Lista de archivos a indexar (opcional)")


class RAGClearRequest(BaseModel):
    path: str = Field(..., min_length=1, description="Ruta al proyecto")


class UploadRequest(BaseModel):
    name: str = Field(..., min_length=1, description="Project name")
    files: dict[str, str] = Field(..., description="Relative path -> file content mapping")


class CloseRequest(BaseModel):
    path: str = Field(..., min_length=1, description="Ruta al workspace del proyecto")


class SearchRequest(BaseModel):
    path: str = Field(..., min_length=1, description="Ruta al proyecto")
    query: str = Field(..., min_length=1, description="Texto a buscar")
    case_sensitive: bool = Field(default=False, description="Busqueda exacta mayus/minus")


class SearchMatch(BaseModel):
    path: str
    line: int
    content: str


class SearchResponse(BaseModel):
    matches: list[SearchMatch]
    total: int
    truncated: bool
