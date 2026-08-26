from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_merchant
from app.core.database import get_db
from app.models.experiment import Experiment, ExperimentStatus
from app.models.merchant import Merchant
from app.services.experiment_engine import (
    complete_experiment,
    compute_results,
    create_experiment,
    serialize_experiment,
    start_experiment,
)

router = APIRouter(prefix="/experiments", tags=["experiments"])


class ExperimentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    population_filter: str = "failed_payments"
    split_ratio: float = Field(default=0.5, ge=0.05, le=0.95)


@router.get("")
def list_experiments(
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    rows = db.query(Experiment).order_by(Experiment.created_at.desc()).all()
    return {"total": len(rows), "items": [serialize_experiment(r) for r in rows]}


@router.post("")
def create(
    payload: ExperimentCreate,
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    try:
        exp = create_experiment(db, payload.name, payload.population_filter, payload.split_ratio)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return serialize_experiment(exp)


@router.get("/{experiment_id}")
def get_experiment(
    experiment_id: str,
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return serialize_experiment(exp)


@router.post("/{experiment_id}/start")
def start(
    experiment_id: str,
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    try:
        exp = start_experiment(db, exp)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return serialize_experiment(exp)


@router.post("/{experiment_id}/complete")
def complete(
    experiment_id: str,
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    if exp.status != ExperimentStatus.running:
        raise HTTPException(status_code=400, detail="only running experiments can be completed")
    return serialize_experiment(complete_experiment(db, exp))


@router.get("/{experiment_id}/results")
def results(
    experiment_id: str,
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return compute_results(db, exp)
