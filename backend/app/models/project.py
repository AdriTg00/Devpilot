from pydantic import BaseModel

class ProjectRequest(BaseModel):
    path: str
    
class ProjectResponse(BaseModel):
    files: list[str]