from fastapi import APIRouter, HTTPException

from app.models.auth import LoginRequest, TokenResponse
from app.services.auth_service import authenticate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest):
    token = authenticate(request.username, request.password)
    if not token:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return TokenResponse(access_token=token)
