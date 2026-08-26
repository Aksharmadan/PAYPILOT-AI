import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_merchant
from app.core.database import get_db
from app.models.merchant import Merchant
from app.models.revenue import RecoveryOpportunity, RevenueEvent
from app.schemas.revenue import (
    OpportunityActionIn,
    PaginatedRecoveryOpportunities,
    RecoveryOpportunityOut,
    RevenueEventOut,
)
from app.services.opportunity_engine import (
    execute_opportunity,
    refresh_opportunities,
    serialize_opportunity,
    transition_opportunity,
)

router = APIRouter(prefix="/opportunities", tags=["opportunities"])


def _customers_for(db: Session, opportunities: list[RecoveryOpportunity]):
    from app.models.revenue import Customer

    ids = {opp.customer_id for opp in opportunities if opp.customer_id}
    if not ids:
        return {}
    return {c.id: c for c in db.query(Customer).filter(Customer.id.in_(ids)).all()}


def _serialize_event(event: RevenueEvent) -> dict:
    try:
        payload = json.loads(event.payload)
    except json.JSONDecodeError:
        payload = {}
    return {
        "id": event.id,
        "event_type": event.event_type,
        "entity_type": event.entity_type,
        "entity_id": event.entity_id,
        "payload": payload,
        "idempotency_key": event.idempotency_key,
        "correlation_id": event.correlation_id,
        "created_at": event.created_at,
    }


@router.post("/refresh")
def refresh(
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    return {"refreshed": refresh_opportunities(db)}


@router.get("", response_model=PaginatedRecoveryOpportunities)
def list_opportunities(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    source: str | None = None,
    confidence: str | None = None,
    status: str | None = None,
    sort: str = Query("expected_recovery", pattern="^(expected_recovery|probability|amount|created_at)$"),
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    refresh_opportunities(db)
    query = db.query(RecoveryOpportunity)
    if source:
        query = query.filter(RecoveryOpportunity.source == source)
    if confidence:
        query = query.filter(RecoveryOpportunity.confidence == confidence)
    if status:
        query = query.filter(RecoveryOpportunity.action_status == status)

    sort_columns = {
        "expected_recovery": RecoveryOpportunity.expected_recovery_value,
        "probability": RecoveryOpportunity.recovery_probability,
        "amount": RecoveryOpportunity.amount_at_risk,
        "created_at": RecoveryOpportunity.created_at,
    }
    total = query.count()
    items = query.order_by(sort_columns[sort].desc()).offset(skip).limit(limit).all()
    customers = _customers_for(db, items)
    return PaginatedRecoveryOpportunities(
        total=total,
        skip=skip,
        limit=limit,
        items=[serialize_opportunity(opp, customers.get(opp.customer_id)) for opp in items],
    )


@router.get("/{opportunity_id}", response_model=RecoveryOpportunityOut)
def get_opportunity(
    opportunity_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    opp = db.query(RecoveryOpportunity).filter(RecoveryOpportunity.id == opportunity_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    customers = _customers_for(db, [opp])
    return serialize_opportunity(opp, customers.get(opp.customer_id))


@router.post("/{opportunity_id}/approve", response_model=RecoveryOpportunityOut)
def approve_opportunity(
    opportunity_id: uuid.UUID,
    db: Session = Depends(get_db),
    current: Merchant = Depends(get_current_merchant),
):
    opp = db.query(RecoveryOpportunity).filter(RecoveryOpportunity.id == opportunity_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    opp = transition_opportunity(db, opp, "approve", merchant_email=current.email)
    customers = _customers_for(db, [opp])
    return serialize_opportunity(opp, customers.get(opp.customer_id))


@router.post("/{opportunity_id}/reject", response_model=RecoveryOpportunityOut)
def reject_opportunity(
    opportunity_id: uuid.UUID,
    db: Session = Depends(get_db),
    current: Merchant = Depends(get_current_merchant),
):
    opp = db.query(RecoveryOpportunity).filter(RecoveryOpportunity.id == opportunity_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    opp = transition_opportunity(db, opp, "reject", merchant_email=current.email)
    customers = _customers_for(db, [opp])
    return serialize_opportunity(opp, customers.get(opp.customer_id))


@router.post("/{opportunity_id}/execute", response_model=RecoveryOpportunityOut)
def execute(
    opportunity_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    opp = db.query(RecoveryOpportunity).filter(RecoveryOpportunity.id == opportunity_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    opp = execute_opportunity(db, opp)
    customers = _customers_for(db, [opp])
    return serialize_opportunity(opp, customers.get(opp.customer_id))


@router.post("/{opportunity_id}/simulate", response_model=RecoveryOpportunityOut)
def simulate(
    opportunity_id: uuid.UUID,
    payload: OpportunityActionIn,
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    if payload.outcome not in (None, "success", "failure"):
        raise HTTPException(status_code=400, detail="outcome must be success or failure")
    opp = db.query(RecoveryOpportunity).filter(RecoveryOpportunity.id == opportunity_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    opp = execute_opportunity(db, opp, force_outcome=payload.outcome)
    customers = _customers_for(db, [opp])
    return serialize_opportunity(opp, customers.get(opp.customer_id))


@router.get("/{opportunity_id}/audit", response_model=list[RevenueEventOut])
def audit(
    opportunity_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    events = (
        db.query(RevenueEvent)
        .filter(RevenueEvent.entity_id == opportunity_id)
        .order_by(RevenueEvent.created_at.desc())
        .all()
    )
    return [_serialize_event(event) for event in events]
