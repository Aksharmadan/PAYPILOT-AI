from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_merchant
from app.core.database import get_db
from app.models.merchant import Merchant
from app.models.revenue import Payment, PaymentStatus
from app.schemas.revenue import PaginatedPayments

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("", response_model=PaginatedPayments)
def list_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: PaymentStatus | None = None,
    customer_id: str | None = None,
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    query = db.query(Payment)
    if status:
        query = query.filter(Payment.status == status)
    if customer_id:
        query = query.filter(Payment.customer_id == customer_id)

    total = query.count()
    items = (
        query.order_by(Payment.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return PaginatedPayments(total=total, skip=skip, limit=limit, items=items)
