from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_merchant
from app.core.database import get_db
from app.models.merchant import Merchant
from app.services.evaluation import (
    calibration,
    evaluation_summary,
    intervention_metrics,
    model_metrics,
    recovery_economics,
)

router = APIRouter(prefix="/evaluation", tags=["evaluation"])


@router.get("/summary")
def summary(
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    return evaluation_summary(db)


@router.get("/model")
def model(
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    return model_metrics(db)


@router.get("/calibration")
def calibration_metrics(
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    return calibration(db)


@router.get("/recovery")
def recovery(
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    return recovery_economics(db)


@router.get("/interventions")
def interventions(
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    return intervention_metrics(db)


@router.get("/confusion-matrix")
def confusion_matrix(
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    return model_metrics(db).get("confusion_matrix")
