from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.revenue import (
    Customer,
    Subscription,
    SubscriptionStatus,
    Payment,
    PaymentStatus,
)


def get_churn_radar(db: Session, limit: int = 50) -> list:
    """
    Return customers at risk of churning, sorted by churn_risk_score descending.

    For each customer:
    - churn_risk_score > 0.3
    - mrr_at_risk: sum of MRR across their active subscriptions
    - reasons: derived from payment history and subscription state
    """
    sixty_days_ago = datetime.utcnow() - timedelta(days=60)

    # Fetch high-risk customers
    customers = (
        db.query(Customer)
        .filter(Customer.churn_risk_score > 0.3)
        .order_by(Customer.churn_risk_score.desc())
        .limit(limit)
        .all()
    )

    if not customers:
        return []

    customer_ids = [c.id for c in customers]

    # Sum of active subscription MRR per customer
    mrr_rows = (
        db.query(
            Subscription.customer_id,
            func.coalesce(func.sum(Subscription.mrr), 0.0).label("total_mrr"),
        )
        .filter(
            Subscription.customer_id.in_(customer_ids),
            Subscription.status == SubscriptionStatus.active,
        )
        .group_by(Subscription.customer_id)
        .all()
    )
    mrr_by_customer = {str(row.customer_id): row.total_mrr for row in mrr_rows}

    # Customers with failed payments in the last 60 days
    failed_payment_customer_ids = {
        str(row[0])
        for row in db.query(Payment.customer_id)
        .filter(
            Payment.customer_id.in_(customer_ids),
            Payment.status == PaymentStatus.failed,
            Payment.created_at >= sixty_days_ago,
        )
        .distinct()
        .all()
    }

    # Customers with past_due subscriptions
    past_due_customer_ids = {
        str(row[0])
        for row in db.query(Subscription.customer_id)
        .filter(
            Subscription.customer_id.in_(customer_ids),
            Subscription.status == SubscriptionStatus.past_due,
        )
        .distinct()
        .all()
    }

    results = []
    for customer in customers:
        cid = str(customer.id)
        reasons = []

        if cid in failed_payment_customer_ids:
            reasons.append("payment_friction")
        if cid in past_due_customer_ids:
            reasons.append("subscription_past_due")
        if customer.churn_risk_score > 0.7:
            reasons.append("high_churn_signal")

        results.append(
            {
                "id": cid,
                "name": customer.name,
                "email": customer.email,
                "churn_risk_score": customer.churn_risk_score,
                "mrr_at_risk": round(mrr_by_customer.get(cid, 0.0), 2),
                "reasons": reasons,
            }
        )

    return results


def get_renewal_radar(db: Session, days: int = 30) -> list:
    """
    Return subscriptions renewing within `days` days, with churn risk classification.
    Sorted by current_period_end ascending.
    """
    now = datetime.utcnow()
    cutoff = now + timedelta(days=days)

    rows = (
        db.query(Subscription, Customer)
        .join(Customer, Customer.id == Subscription.customer_id)
        .filter(
            Subscription.current_period_end >= now,
            Subscription.current_period_end <= cutoff,
            Subscription.status.in_(
                [SubscriptionStatus.active, SubscriptionStatus.past_due]
            ),
        )
        .order_by(Subscription.current_period_end.asc())
        .all()
    )

    results = []
    for sub, customer in rows:
        score = customer.churn_risk_score or 0.0

        if score > 0.65:
            risk_level = "high"
        elif score > 0.35:
            risk_level = "medium"
        else:
            risk_level = "low"

        days_until_renewal = (sub.current_period_end - now).days

        results.append(
            {
                "id": str(sub.id),
                "customer_id": str(customer.id),
                "customer_name": customer.name,
                "customer_email": customer.email,
                "plan_name": sub.plan_name,
                "mrr": round(sub.mrr, 2),
                "current_period_end": sub.current_period_end.isoformat(),
                "risk_level": risk_level,
                "churn_risk_score": score,
                "days_until_renewal": days_until_renewal,
            }
        )

    return results
