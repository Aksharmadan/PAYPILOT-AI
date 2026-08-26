from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_merchant
from app.core.database import get_db
from app.models.merchant import Merchant
from app.models.revenue import (
    Payment, PaymentStatus, CheckoutSession, CheckoutStatus,
    Subscription, SubscriptionStatus, RecoveryAttempt, RecoveryStatus,
)
from app.schemas.revenue import RevenueSummaryOut, RevenueAtRiskOut, RevenueAtRiskSource
from app.api.routes.risk import compute_high_confidence_total

router = APIRouter(prefix="/revenue", tags=["revenue"])


def _recovered_payment_ids(db: Session):
    rows = (
        db.query(RecoveryAttempt.payment_id)
        .filter(RecoveryAttempt.status == RecoveryStatus.succeeded)
        .filter(RecoveryAttempt.payment_id.isnot(None))
        .all()
    )
    return {r[0] for r in rows}


def _recovered_checkout_ids(db: Session):
    rows = (
        db.query(RecoveryAttempt.checkout_session_id)
        .filter(RecoveryAttempt.status == RecoveryStatus.succeeded)
        .filter(RecoveryAttempt.checkout_session_id.isnot(None))
        .all()
    )
    return {r[0] for r in rows}


@router.get("/at-risk", response_model=RevenueAtRiskOut)
def revenue_at_risk(
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    recovered_payment_ids = _recovered_payment_ids(db)
    recovered_checkout_ids = _recovered_checkout_ids(db)

    failed_amount = (
        db.query(func.coalesce(func.sum(Payment.amount), 0.0))
        .filter(Payment.status == PaymentStatus.failed)
        .filter(~Payment.id.in_(recovered_payment_ids) if recovered_payment_ids else True)
        .scalar()
    )

    abandoned_amount = (
        db.query(func.coalesce(func.sum(CheckoutSession.amount), 0.0))
        .filter(CheckoutSession.status == CheckoutStatus.abandoned)
        .filter(~CheckoutSession.id.in_(recovered_checkout_ids) if recovered_checkout_ids else True)
        .scalar()
    )

    past_due_mrr = (
        db.query(func.coalesce(func.sum(Subscription.mrr), 0.0))
        .filter(Subscription.status == SubscriptionStatus.past_due)
        .scalar()
    )

    pending_amount = (
        db.query(func.coalesce(func.sum(Payment.amount), 0.0))
        .filter(Payment.status == PaymentStatus.pending)
        .scalar()
    )

    by_source = [
        RevenueAtRiskSource(source="Failed Payments", amount=round(failed_amount, 2)),
        RevenueAtRiskSource(source="Checkout Abandonment", amount=round(abandoned_amount, 2)),
        RevenueAtRiskSource(source="Subscriptions", amount=round(past_due_mrr, 2)),
        RevenueAtRiskSource(source="Other", amount=round(pending_amount, 2)),
    ]
    total = round(sum(s.amount for s in by_source), 2)

    return RevenueAtRiskOut(total_at_risk=total, by_source=by_source)


@router.get("/summary", response_model=RevenueSummaryOut)
def revenue_summary(
    days: int = Query(1, ge=1, le=365, description="Trailing window in days. Use a larger value if seed data is sparse for 'today'."),
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    since = datetime.utcnow() - timedelta(days=days)

    revenue_period = (
        db.query(func.coalesce(func.sum(Payment.amount), 0.0))
        .filter(Payment.status == PaymentStatus.succeeded)
        .filter(Payment.created_at >= since)
        .scalar()
    )

    at_risk = revenue_at_risk(db=db, _=None)  # reuse logic above
    recovered_period = (
        db.query(func.coalesce(func.sum(RecoveryAttempt.recovered_amount), 0.0))
        .filter(RecoveryAttempt.status == RecoveryStatus.succeeded)
        .filter(RecoveryAttempt.created_at >= since)
        .scalar()
    )

    total_processed = (
        db.query(func.coalesce(func.sum(Payment.amount), 0.0))
        .filter(Payment.created_at >= since)
        .scalar()
    ) or 1.0  # avoid divide-by-zero

    health_score = max(0, min(100, round(100 - (at_risk.total_at_risk / total_processed * 100))))

    return RevenueSummaryOut(
        revenue_period=round(revenue_period, 2),
        revenue_health_score=health_score,
        revenue_at_risk=at_risk.total_at_risk,
        high_confidence_recoverable=compute_high_confidence_total(db),
        recovered_period=round(recovered_period, 2),
        period_days=days,
    )
