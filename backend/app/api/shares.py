from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.share import ShareRequest, ShareResponse
from app.services.share_service import share_service

router = APIRouter(tags=["shares"])


@router.post("/project/share", response_model=ShareResponse)
def create_share(request: ShareRequest, db: Session = Depends(get_db)):
    from app.core.validators import validate_directory
    validate_directory(request.path)

    try:
        result = share_service.create_share(request.path, request.expiry_days, db=db)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
