from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_merchant
from app.core.database import get_db
from app.models.merchant import Merchant
from app.models.revenue import Subscription, SubscriptionStatus
from app.schemas.revenue import PaginatedSubscriptions

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.get("", response_model=PaginatedSubscriptions)
def list_subscriptions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: SubscriptionStatus | None = None,
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    query = db.query(Subscription)
    if status:
        query = query.filter(Subscription.status == status)

    total = query.count()
    items = (
        query.order_by(Subscription.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return PaginatedSubscriptions(total=total, skip=skip, limit=limit, items=items)
