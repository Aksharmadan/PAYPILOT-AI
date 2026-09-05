from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_merchant
from app.core.database import get_db
from app.models.merchant import Merchant
from app.services.leak_detector import detect_leaks
from app.services.recommendations import get_recommendations
from app.schemas.revenue import RevenueLeakOut, RecommendationOut

router = APIRouter(prefix="/intelligence", tags=["intelligence"])


@router.get("/leaks", response_model=list[RevenueLeakOut])
def leaks(db: Session = Depends(get_db), _: Merchant = Depends(get_current_merchant)):
    return detect_leaks(db)


@router.get("/recommendations", response_model=list[RecommendationOut])
def recommendations(db: Session = Depends(get_db), _: Merchant = Depends(get_current_merchant)):
    return get_recommendations(db)
