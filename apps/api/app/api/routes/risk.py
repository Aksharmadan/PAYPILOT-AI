from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_merchant
from app.core.database import get_db
from app.models.merchant import Merchant
from app.models.revenue import (
    Payment, PaymentStatus, CheckoutSession, CheckoutStatus, Customer,
    RecoveryAttempt, RecoveryStatus,
)
from app.schemas.revenue import RiskDistributionOut, RiskItemOut
from app.services.risk_scoring import score_payment, score_checkout, classify
from app.services.anomaly import detect_failure_rate_anomaly

router = APIRouter(prefix="/risk", tags=["risk"])


def _customer_ids_with_prior_recovery_success(db: Session):
    rows = (
        db.query(Payment.customer_id)
        .join(RecoveryAttempt, RecoveryAttempt.payment_id == Payment.id)
        .filter(RecoveryAttempt.status == RecoveryStatus.succeeded)
        .distinct()
        .all()
    )
    return {r[0] for r in rows if r[0] is not None}


def compute_high_confidence_total(db: Session, limit: int = 500) -> float:
    """Shared by /risk/distribution and /revenue/summary so both report the same number."""
    customers_by_id = {c.id: c for c in db.query(Customer).all()}
    prior_success = _customer_ids_with_prior_recovery_success(db)

    failed_payments = (
        db.query(Payment).filter(Payment.status == PaymentStatus.failed)
        .order_by(Payment.created_at.desc()).limit(limit).all()
    )
    abandoned_checkouts = (
        db.query(CheckoutSession).filter(CheckoutSession.status == CheckoutStatus.abandoned)
        .order_by(CheckoutSession.started_at.desc()).limit(limit).all()
    )
    total = 0.0
    for p in failed_payments:
        score = score_payment(p, customers_by_id.get(p.customer_id), p.customer_id in prior_success)
        if classify(score) == "high":
            total += p.amount
    for c in abandoned_checkouts:
        if classify(score_checkout(c)) == "high":
            total += c.amount
    return round(total, 2)


@router.get("/distribution", response_model=RiskDistributionOut)
def risk_distribution(
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    customers_by_id = {c.id: c for c in db.query(Customer).all()}
    prior_success = _customer_ids_with_prior_recovery_success(db)

    failed_payments = (
        db.query(Payment)
        .filter(Payment.status == PaymentStatus.failed)
        .order_by(Payment.created_at.desc())
        .limit(limit)
        .all()
    )
    abandoned_checkouts = (
        db.query(CheckoutSession)
        .filter(CheckoutSession.status == CheckoutStatus.abandoned)
        .order_by(CheckoutSession.started_at.desc())
        .limit(limit)
        .all()
    )

    items: list[RiskItemOut] = []

    for p in failed_payments:
        customer = customers_by_id.get(p.customer_id)
        had_success = p.customer_id in prior_success
        score = score_payment(p, customer, had_success)
        reason_val = getattr(p.failure_reason, "value", p.failure_reason)
        items.append(RiskItemOut(
            id=p.id,
            type="payment",
            amount=p.amount,
            recoverability_score=score,
            confidence=classify(score),
            reason=(
                f"{p.payment_method or 'unknown method'}, {reason_val}, "
                f"{p.retry_count} retries, {(customer.churn_risk_score if customer else 0):.0%} churn risk"
                + (", prior recovery success" if had_success else "")
            ),
        ))

    for c in abandoned_checkouts:
        score = score_checkout(c)
        items.append(RiskItemOut(
            id=c.id,
            type="checkout",
            amount=c.amount,
            recoverability_score=score,
            confidence=classify(score),
            reason="abandoned checkout, no retry history",
        ))

    high = round(sum(i.amount for i in items if i.confidence == "high"), 2)
    medium = round(sum(i.amount for i in items if i.confidence == "medium"), 2)
    low = round(sum(i.amount for i in items if i.confidence == "low"), 2)

    items.sort(key=lambda i: i.recoverability_score, reverse=True)

    return RiskDistributionOut(
        high_confidence_amount=high,
        medium_confidence_amount=medium,
        low_confidence_amount=low,
        items=items[:100],
    )


@router.get("/anomaly")
def failure_anomaly(
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    return detect_failure_rate_anomaly(db)
