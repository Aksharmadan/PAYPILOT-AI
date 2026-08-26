import json

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_merchant
from app.core.database import get_db
from app.models.audit import AuditDecision
from app.models.merchant import Merchant
from app.models.revenue import RevenueEvent
from app.schemas.revenue import PaginatedRevenueEvents

router = APIRouter(prefix="/audit", tags=["audit"])


def _event_out(event: RevenueEvent) -> dict:
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


@router.get("/events", response_model=PaginatedRevenueEvents)
def list_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    query = db.query(RevenueEvent)
    total = query.count()
    rows = query.order_by(RevenueEvent.created_at.desc()).offset(skip).limit(limit).all()
    return PaginatedRevenueEvents(total=total, skip=skip, limit=limit, items=[_event_out(row) for row in rows])


@router.get("/decisions")
def list_decisions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    query = db.query(AuditDecision)
    total = query.count()
    rows = query.order_by(AuditDecision.created_at.desc()).offset(skip).limit(limit).all()
    items = []
    for row in rows:
        try:
            payload = json.loads(row.payload)
        except json.JSONDecodeError:
            payload = {}
        items.append(
            {
                "id": row.id,
                "merchant_email": row.merchant_email,
                "opportunity_id": row.opportunity_id,
                "decision": row.decision,
                "outcome": row.outcome,
                "payload": payload,
                "created_at": row.created_at,
            }
        )
    return {"total": total, "skip": skip, "limit": limit, "items": items}
