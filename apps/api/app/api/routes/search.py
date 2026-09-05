"""Global entity search for ⌘K."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_merchant
from app.core.database import get_db
from app.models.merchant import Merchant
from app.models.revenue import Customer, Payment, RecoveryOpportunity
from app.schemas.revenue import SearchHitOut, SearchResultsOut

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=SearchResultsOut)
def global_search(
    q: str = Query(..., min_length=1, max_length=120),
    limit: int = Query(8, ge=1, le=20),
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    like = f"%{q.strip()}%"
    hits: list[SearchHitOut] = []

    for c in (
        db.query(Customer)
        .filter((Customer.name.ilike(like)) | (Customer.email.ilike(like)))
        .order_by(Customer.lifetime_value.desc())
        .limit(limit)
        .all()
    ):
        hits.append(
            SearchHitOut(
                id=str(c.id),
                type="customer",
                title=c.name,
                subtitle=c.email,
                href=f"/customers?id={c.id}",
                meta=f"LTV ₹{c.lifetime_value:,.0f}",
            )
        )

    for p in (
        db.query(Payment)
        .filter(Payment.failure_reason.isnot(None))
        .order_by(Payment.created_at.desc())
        .limit(limit * 3)
        .all()
    ):
        reason = getattr(p.failure_reason, "value", str(p.failure_reason or ""))
        blob = f"{p.amount} {p.status} {p.payment_method or ''} {reason}".lower()
        if q.strip().lower() not in blob and not q.replace(",", "").replace("₹", "").isdigit():
            # Allow numeric amount search
            try:
                amount_q = float(q.replace(",", "").replace("₹", "").strip())
                if abs(p.amount - amount_q) > 1:
                    continue
            except ValueError:
                continue
        hits.append(
            SearchHitOut(
                id=str(p.id),
                type="payment",
                title=f"₹{p.amount:,.0f} · {p.status}",
                subtitle=reason or (p.payment_method or "payment"),
                href=f"/payments?id={p.id}",
                meta=p.created_at.strftime("%Y-%m-%d") if p.created_at else None,
            )
        )
        if sum(1 for h in hits if h.type == "payment") >= limit:
            break

    for opp in (
        db.query(RecoveryOpportunity)
        .order_by(RecoveryOpportunity.expected_recovery_value.desc())
        .limit(limit * 2)
        .all()
    ):
        blob = f"{opp.source} {opp.amount_at_risk} {opp.confidence} {opp.priority}".lower()
        if q.strip().lower() not in blob:
            try:
                amount_q = float(q.replace(",", "").replace("₹", "").strip())
                if abs(opp.amount_at_risk - amount_q) > 1 and abs(opp.expected_recovery_value - amount_q) > 1:
                    continue
            except ValueError:
                continue
        hits.append(
            SearchHitOut(
                id=str(opp.id),
                type="opportunity",
                title=f"{opp.source.value} · ₹{opp.expected_recovery_value:,.0f} expected",
                subtitle=f"{opp.confidence.value} confidence · {opp.priority.value}",
                href=f"/revenue/opportunities?id={opp.id}",
                meta=f"₹{opp.amount_at_risk:,.0f} at risk",
            )
        )
        if sum(1 for h in hits if h.type == "opportunity") >= limit:
            break

    return SearchResultsOut(query=q, total=len(hits), items=hits[: limit * 3])
