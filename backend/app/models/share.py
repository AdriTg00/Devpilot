from pydantic import BaseModel, Field


class ShareRequest(BaseModel):
    path: str = Field(..., min_length=1, description="Ruta del proyecto a compartir")
    expiry_days: int = Field(default=7, ge=1, le=30, description="Dias hasta que expire el link")


class ShareResponse(BaseModel):
    token: str
    url: str
    expires_at: str
    created_at: str


class SharedProject(BaseModel):
    token: str
    project_name: str
    project_path: str
    analysis: dict
    file_tree: list[str]
    file_count: int
    created_at: str
    expires_at: str
