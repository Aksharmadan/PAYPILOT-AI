"""
Revenue leak detector -- compares a recent window against a baseline window
across payment-method failure rates, checkout abandonment, and high-value
customer failures. Only returns a leak when the shift clears a real
threshold with enough sample size -- nothing is invented.
"""
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.revenue import Payment, PaymentStatus, CheckoutSession, CheckoutStatus, Customer

RECENT_WINDOW_DAYS = 14
BASELINE_WINDOW_DAYS = 28
MIN_SAMPLE_SIZE = 8
RELATIVE_INCREASE_THRESHOLD = 1.15


def _failure_rate(db: Session, method: str, start: datetime, end: datetime):
    total = db.query(func.count(Payment.id)).filter(
        Payment.payment_method == method, Payment.created_at >= start, Payment.created_at < end,
    ).scalar()
    if not total:
        return None, 0
    failed = db.query(func.count(Payment.id)).filter(
        Payment.payment_method == method, Payment.status == PaymentStatus.failed,
        Payment.created_at >= start, Payment.created_at < end,
    ).scalar()
    return failed / total, total


def detect_leaks(db: Session) -> list[dict]:
    now = datetime.utcnow()
    recent_start = now - timedelta(days=RECENT_WINDOW_DAYS)
    baseline_start = recent_start - timedelta(days=BASELINE_WINDOW_DAYS)
    leaks = []

    methods = [r[0] for r in db.query(Payment.payment_method).distinct().all() if r[0]]
    for method in methods:
        recent_rate, recent_n = _failure_rate(db, method, recent_start, now)
        baseline_rate, baseline_n = _failure_rate(db, method, baseline_start, recent_start)
        if recent_rate is None or baseline_rate is None or baseline_rate <= 0:
            continue
        if recent_n < MIN_SAMPLE_SIZE or baseline_n < MIN_SAMPLE_SIZE:
            continue
        ratio = recent_rate / baseline_rate
        if ratio >= RELATIVE_INCREASE_THRESHOLD:
            amount = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
                Payment.payment_method == method, Payment.status == PaymentStatus.failed,
                Payment.created_at >= recent_start,
            ).scalar()
            leaks.append({
                "title": f"{method.upper()} failure rate increased {round((ratio - 1) * 100)}%",
                "impact_amount": round(amount, 2),
                "cause": f"{method} failures rose from {baseline_rate*100:.1f}% to {recent_rate*100:.1f}% over the last {RECENT_WINDOW_DAYS} days.",
                "confidence": "high" if ratio >= 1.4 else "medium",
                "recommended_action": f"Review {method} recovery eligibility -- {recent_n} recent transactions affected.",
                "potential_recovery": round(amount * 0.4, 2),
            })

    recent_abandoned = db.query(func.coalesce(func.sum(CheckoutSession.amount), 0.0)).filter(
        CheckoutSession.status == CheckoutStatus.abandoned, CheckoutSession.started_at >= recent_start,
    ).scalar()
    baseline_abandoned = db.query(func.coalesce(func.sum(CheckoutSession.amount), 0.0)).filter(
        CheckoutSession.status == CheckoutStatus.abandoned,
        CheckoutSession.started_at >= baseline_start, CheckoutSession.started_at < recent_start,
    ).scalar()
    baseline_daily = (baseline_abandoned / BASELINE_WINDOW_DAYS) if baseline_abandoned else 0
    recent_daily = (recent_abandoned / RECENT_WINDOW_DAYS) if recent_abandoned else 0
    if baseline_daily > 0 and recent_daily / baseline_daily >= RELATIVE_INCREASE_THRESHOLD:
        leaks.append({
            "title": "Checkout abandonment rising",
            "impact_amount": round(recent_abandoned, 2),
            "cause": f"Daily abandoned checkout value is up {round((recent_daily/baseline_daily - 1)*100)}% vs the prior {BASELINE_WINDOW_DAYS}-day baseline.",
            "confidence": "medium",
            "recommended_action": "Review the highest-value abandoned sessions in the recovery queue.",
            "potential_recovery": round(recent_abandoned * 0.25, 2),
        })

    customers = db.query(Customer.id, Customer.lifetime_value).all()
    if customers:
        values = sorted(c.lifetime_value for c in customers)
        ltv_threshold = values[min(int(len(values) * 0.75), len(values) - 1)]
        affected = (
            db.query(Customer).join(Payment, Payment.customer_id == Customer.id)
            .filter(Customer.lifetime_value >= ltv_threshold, Payment.status == PaymentStatus.failed,
                    Payment.created_at >= recent_start)
            .distinct().all()
        )
        if affected:
            total_ltv = sum(c.lifetime_value for c in affected)
            leaks.append({
                "title": f"{len(affected)} high-value customers had a failed payment",
                "impact_amount": round(total_ltv, 2),
                "cause": f"These customers are in your top 25% by lifetime value and had a failure in the last {RECENT_WINDOW_DAYS} days.",
                "confidence": "high",
                "recommended_action": "Prioritize these customers in the recovery queue -- churn risk compounds with payment friction.",
                "potential_recovery": round(total_ltv * 0.1, 2),
            })

    leaks.sort(key=lambda l: l["impact_amount"], reverse=True)
    return leaks
