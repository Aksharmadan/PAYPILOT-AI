"""Rules-based customer segmentation using existing fields."""

from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.revenue import Customer, Payment, PaymentStatus, RecoveryAttempt, RecoveryStatus


SEGMENTS = ("high-value", "loyal", "price-sensitive", "churn-risk", "high-intent")


def classify_customer_segment(customer: Customer, *, recovery_successes: int = 0, failed_payments: int = 0) -> str:
    """Deterministic segment label — first matching rule wins."""
    ltv = customer.lifetime_value or 0.0
    churn = customer.churn_risk_score or 0.0

    if churn >= 0.65 and ltv >= 10000:
        return "churn-risk"
    if ltv >= 50000:
        return "high-value"
    if recovery_successes >= 2 or (ltv >= 15000 and churn <= 0.35):
        return "loyal"
    if failed_payments >= 3 and ltv < 8000:
        return "price-sensitive"
    if churn <= 0.4 and ltv >= 5000:
        return "high-intent"
    if churn >= 0.55:
        return "churn-risk"
    if ltv >= 20000:
        return "high-value"
    return "high-intent"


def segment_for_customer(db: Session, customer: Customer) -> str:
    recovery_successes = (
        db.query(func.count(RecoveryAttempt.id))
        .join(Payment, RecoveryAttempt.payment_id == Payment.id)
        .filter(Payment.customer_id == customer.id)
        .filter(RecoveryAttempt.status == RecoveryStatus.succeeded)
        .scalar()
        or 0
    )
    failed_payments = (
        db.query(func.count(Payment.id))
        .filter(Payment.customer_id == customer.id, Payment.status == PaymentStatus.failed)
        .scalar()
        or 0
    )
    return classify_customer_segment(
        customer,
        recovery_successes=recovery_successes,
        failed_payments=failed_payments,
    )


def segments_for_customers(db: Session, customers: list[Customer]) -> dict:
    """Batch segment labels — 2 queries total instead of 2N."""
    if not customers:
        return {}
    ids = [c.id for c in customers]

    recovery_rows = (
        db.query(Payment.customer_id, func.count(RecoveryAttempt.id))
        .join(RecoveryAttempt, RecoveryAttempt.payment_id == Payment.id)
        .filter(Payment.customer_id.in_(ids))
        .filter(RecoveryAttempt.status == RecoveryStatus.succeeded)
        .group_by(Payment.customer_id)
        .all()
    )
    failed_rows = (
        db.query(Payment.customer_id, func.count(Payment.id))
        .filter(Payment.customer_id.in_(ids), Payment.status == PaymentStatus.failed)
        .group_by(Payment.customer_id)
        .all()
    )
    recovery_map = {cid: n for cid, n in recovery_rows}
    failed_map = {cid: n for cid, n in failed_rows}
    return {
        c.id: classify_customer_segment(
            c,
            recovery_successes=recovery_map.get(c.id, 0),
            failed_payments=failed_map.get(c.id, 0),
        )
        for c in customers
    }
