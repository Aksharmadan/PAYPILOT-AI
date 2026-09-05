from datetime import datetime, timedelta
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_merchant
from app.core.database import get_db
from app.models.merchant import Merchant
from app.models.revenue import (
    Customer,
    Payment,
    PaymentStatus,
    RecoveryAttempt,
    RecoveryOpportunity,
    RecoveryStatus,
    Subscription,
    SubscriptionStatus,
    RevenueEvent,
)
from app.schemas.revenue import CustomerOut, PaginatedCustomers
from app.services.segmentation import segment_for_customer, segments_for_customers

router = APIRouter(prefix="/customers", tags=["customers"])


def _customer_out(db: Session, customer: Customer, segment: str | None = None) -> CustomerOut:
    data = CustomerOut.model_validate(customer).model_dump()
    data["segment"] = segment if segment is not None else segment_for_customer(db, customer)
    return CustomerOut(**data)


@router.get("", response_model=PaginatedCustomers)
def list_customers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: str | None = None,
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    query = db.query(Customer)
    if search:
        like = f"%{search}%"
        query = query.filter((Customer.name.ilike(like)) | (Customer.email.ilike(like)))

    total = query.count()
    items = (
        query.order_by(Customer.lifetime_value.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    segments = segments_for_customers(db, items)
    return PaginatedCustomers(
        total=total,
        skip=skip,
        limit=limit,
        items=[_customer_out(db, c, segments.get(c.id)) for c in items],
    )


@router.get("/{customer_id}/detail")
def get_customer_detail(
    customer_id: str,
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    """Customer 360 — full intelligence profile for a single customer.

    Returns the customer's health summary, subscription, payment history,
    recovery outcomes, risk factors, and a chronological activity timeline.
    All numbers come from the database — nothing is hardcoded.
    """
    try:
        cid = uuid.UUID(customer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid customer ID format")

    customer = db.query(Customer).filter(Customer.id == cid).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    segment = segment_for_customer(db, customer)

    # ── Subscription ──────────────────────────────────────────────────────
    subscription = (
        db.query(Subscription)
        .filter(Subscription.customer_id == cid)
        .order_by(Subscription.created_at.desc())
        .first()
    )

    # ── Payment metrics ───────────────────────────────────────────────────
    all_payments = (
        db.query(Payment)
        .filter(Payment.customer_id == cid)
        .order_by(Payment.created_at.desc())
        .all()
    )
    total_payments = len(all_payments)
    succeeded_payments = [p for p in all_payments if p.status == PaymentStatus.succeeded]
    failed_payments = [p for p in all_payments if p.status == PaymentStatus.failed]
    payment_success_rate = round(len(succeeded_payments) / total_payments, 4) if total_payments else 0.0

    # ── Recovery metrics ─────────────────────────────────────────────────
    payment_ids = [p.id for p in all_payments]
    recovery_attempts = (
        db.query(RecoveryAttempt)
        .filter(RecoveryAttempt.payment_id.in_(payment_ids))
        .order_by(RecoveryAttempt.created_at.desc())
        .all()
    ) if payment_ids else []

    total_attempts = len(recovery_attempts)
    successful_attempts = [a for a in recovery_attempts if a.status == RecoveryStatus.succeeded]
    recovery_success_rate = round(len(successful_attempts) / total_attempts, 4) if total_attempts else 0.0
    total_recovered = sum(a.recovered_amount or 0 for a in successful_attempts)

    # ── Open opportunity ──────────────────────────────────────────────────
    open_opportunity = (
        db.query(RecoveryOpportunity)
        .filter(RecoveryOpportunity.customer_id == cid)
        .filter(RecoveryOpportunity.outcome == "pending")
        .order_by(RecoveryOpportunity.expected_recovery_value.desc())
        .first()
    )

    # Revenue at risk for this customer
    revenue_at_risk = sum(p.amount for p in failed_payments)
    expected_recovery = float(open_opportunity.expected_recovery_value) if open_opportunity else 0.0

    # ── Renewal history ───────────────────────────────────────────────────
    sub_payments = [p for p in all_payments if p.subscription_id is not None]
    successful_renewals = len([p for p in sub_payments if p.status == PaymentStatus.succeeded])
    failed_renewals = len([p for p in sub_payments if p.status == PaymentStatus.failed])

    # ── Risk factors ─────────────────────────────────────────────────────
    risk_factors = []
    if customer.churn_risk_score >= 0.7:
        risk_factors.append({"factor": "High churn risk", "severity": "critical", "detail": f"Churn probability: {customer.churn_risk_score:.0%}"})
    elif customer.churn_risk_score >= 0.4:
        risk_factors.append({"factor": "Elevated churn risk", "severity": "warning", "detail": f"Churn probability: {customer.churn_risk_score:.0%}"})

    if failed_renewals >= 3:
        risk_factors.append({"factor": "Multiple renewal failures", "severity": "critical", "detail": f"{failed_renewals} consecutive failures"})
    elif failed_renewals >= 1:
        risk_factors.append({"factor": "Renewal failure detected", "severity": "warning", "detail": f"{failed_renewals} failed renewal(s)"})

    if payment_success_rate < 0.7 and total_payments >= 3:
        risk_factors.append({"factor": "Low payment success rate", "severity": "warning", "detail": f"{payment_success_rate:.0%} success across {total_payments} payments"})

    if subscription and subscription.status == SubscriptionStatus.past_due:
        days_past = max((datetime.utcnow() - subscription.current_period_end).days, 0)
        risk_factors.append({"factor": "Subscription past due", "severity": "critical", "detail": f"{days_past} days overdue"})

    if not risk_factors:
        risk_factors.append({"factor": "No significant risk signals", "severity": "healthy", "detail": "Customer appears healthy"})

    # ── AI summary ────────────────────────────────────────────────────────
    health_score = _compute_health_score(customer, payment_success_rate, recovery_success_rate, subscription)
    recommended_action = _recommend_action(customer, open_opportunity, subscription, failed_payments)

    # ── Timeline ─────────────────────────────────────────────────────────
    timeline = _build_timeline(customer, subscription, all_payments, recovery_attempts, db)

    return {
        "id": str(customer.id),
        "name": customer.name,
        "email": customer.email,
        "country": customer.country,
        "plan": customer.plan,
        "segment": segment,
        "created_at": customer.created_at.isoformat(),
        "lifetime_value": customer.lifetime_value,
        "churn_risk_score": customer.churn_risk_score,
        "health_score": health_score,
        # Subscription
        "subscription": _serialize_sub(subscription) if subscription else None,
        # MRR
        "mrr": subscription.mrr if subscription else 0.0,
        "mrr_at_risk": subscription.mrr if (subscription and subscription.status == SubscriptionStatus.past_due) else 0.0,
        # Payment metrics
        "total_payments": total_payments,
        "payment_success_rate": payment_success_rate,
        "failed_payment_count": len(failed_payments),
        "successful_renewals": successful_renewals,
        "failed_renewals": failed_renewals,
        # Recovery
        "total_recovery_attempts": total_attempts,
        "recovery_success_rate": recovery_success_rate,
        "total_recovered": round(total_recovered, 2),
        "revenue_at_risk": round(revenue_at_risk, 2),
        "expected_recovery": round(expected_recovery, 2),
        # Open opportunity
        "open_opportunity": _serialize_opp(open_opportunity) if open_opportunity else None,
        # Risk
        "risk_factors": risk_factors,
        # Intelligence
        "recommended_action": recommended_action,
        # Timeline
        "timeline": timeline[:30],  # cap at 30 most recent events
        # Recent payments (last 10)
        "recent_payments": [_serialize_payment(p) for p in all_payments[:10]],
    }


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return _customer_out(db, customer)


# ── Private helpers ───────────────────────────────────────────────────────────

def _compute_health_score(
    customer: Customer,
    payment_success_rate: float,
    recovery_success_rate: float,
    subscription: Optional[Subscription],
) -> int:
    score = 100

    # Churn risk penalty (0–30 points)
    score -= int(customer.churn_risk_score * 30)

    # Payment success rate (0–30 points)
    score -= int((1 - payment_success_rate) * 30)

    # Subscription status (0–20 points)
    if subscription:
        if subscription.status == SubscriptionStatus.past_due:
            score -= 20
        elif subscription.status == SubscriptionStatus.canceled:
            score -= 15

    # Recovery success rate bonus (up to +10)
    if recovery_success_rate > 0:
        score += int(recovery_success_rate * 10)

    return max(0, min(100, score))


def _recommend_action(
    customer: Customer,
    opportunity: Optional[RecoveryOpportunity],
    subscription: Optional[Subscription],
    failed_payments: list,
) -> str:
    if opportunity and opportunity.policy_status.value == "auto":
        return f"Auto-retry eligible — {opportunity.recommended_intervention.value.replace('_', ' ')} queued"
    if opportunity and opportunity.policy_status.value == "approval_required":
        return f"Approve recovery — ₹{opportunity.expected_recovery_value:,.0f} expected"
    if opportunity and opportunity.policy_status.value == "escalated":
        return "Escalate to account manager — high-value customer at risk"
    if subscription and subscription.status == SubscriptionStatus.past_due:
        return "Initiate subscription recovery outreach"
    if customer.churn_risk_score >= 0.7:
        return "Proactive retention outreach recommended"
    if failed_payments:
        return "Review failed payment — consider manual outreach"
    return "No immediate action required — monitor renewal"


def _serialize_sub(sub: Subscription) -> dict:
    return {
        "id": str(sub.id),
        "plan_name": sub.plan_name,
        "mrr": sub.mrr,
        "status": sub.status.value,
        "current_period_end": sub.current_period_end.isoformat(),
        "created_at": sub.created_at.isoformat(),
        "canceled_at": sub.canceled_at.isoformat() if sub.canceled_at else None,
    }


def _serialize_opp(opp: RecoveryOpportunity) -> dict:
    return {
        "id": str(opp.id),
        "source": opp.source.value,
        "amount_at_risk": opp.amount_at_risk,
        "recovery_probability": opp.recovery_probability,
        "expected_recovery_value": opp.expected_recovery_value,
        "priority": opp.priority.value,
        "confidence": opp.confidence.value,
        "recommended_intervention": opp.recommended_intervention.value,
        "policy_status": opp.policy_status.value,
        "action_status": opp.action_status.value,
    }


def _serialize_payment(p: Payment) -> dict:
    return {
        "id": str(p.id),
        "amount": p.amount,
        "status": p.status.value,
        "failure_reason": p.failure_reason.value if p.failure_reason else None,
        "payment_method": p.payment_method,
        "retry_count": p.retry_count,
        "created_at": p.created_at.isoformat(),
    }


def _build_timeline(
    customer: Customer,
    subscription: Optional[Subscription],
    payments: list[Payment],
    attempts: list[RecoveryAttempt],
    db: Session,
) -> list[dict]:
    events = []

    # Customer created
    events.append({
        "ts": customer.created_at.isoformat(),
        "type": "customer_created",
        "title": "Customer account created",
        "detail": f"Joined on {customer.plan or 'free'} plan",
        "icon": "user",
    })

    # Subscription events
    if subscription:
        events.append({
            "ts": subscription.created_at.isoformat(),
            "type": "subscription_started",
            "title": f"Subscribed to {subscription.plan_name}",
            "detail": f"₹{subscription.mrr:,.0f}/month",
            "icon": "credit-card",
        })
        if subscription.status == SubscriptionStatus.past_due:
            events.append({
                "ts": subscription.current_period_end.isoformat(),
                "type": "subscription_past_due",
                "title": "Subscription became past due",
                "detail": f"₹{subscription.mrr:,.0f} outstanding",
                "icon": "alert-triangle",
                "severity": "critical",
            })
        if subscription.canceled_at:
            events.append({
                "ts": subscription.canceled_at.isoformat(),
                "type": "subscription_canceled",
                "title": "Subscription canceled",
                "detail": subscription.plan_name,
                "icon": "x-circle",
                "severity": "warning",
            })

    # Payment events (most recent 20)
    attempt_by_payment = {a.payment_id: a for a in attempts if a.payment_id}
    for p in payments[:20]:
        evt = {
            "ts": p.created_at.isoformat(),
            "amount": p.amount,
        }
        if p.status == PaymentStatus.succeeded:
            evt.update({"type": "payment_succeeded", "title": f"Payment succeeded", "detail": f"₹{p.amount:,.0f} via {p.payment_method}", "icon": "check-circle", "severity": "success"})
        elif p.status == PaymentStatus.failed:
            reason = p.failure_reason.value.replace("_", " ") if p.failure_reason else "unknown"
            evt.update({"type": "payment_failed", "title": f"Payment failed — {reason}", "detail": f"₹{p.amount:,.0f} via {p.payment_method}", "icon": "x-circle", "severity": "critical"})
            # Attach recovery attempt if one exists
            attempt = attempt_by_payment.get(p.id)
            if attempt:
                a_evt = {
                    "ts": attempt.created_at.isoformat(),
                    "type": f"recovery_{attempt.status.value}",
                    "title": f"Recovery {attempt.status.value}",
                    "detail": f"{attempt.method.value.replace('_', ' ')} — ₹{attempt.recovered_amount or 0:,.0f}",
                    "icon": "refresh-cw" if attempt.status.value == "succeeded" else "alert-circle",
                    "severity": "success" if attempt.status.value == "succeeded" else "warning",
                    "amount": attempt.recovered_amount,
                }
                events.append(a_evt)
        elif p.status == PaymentStatus.refunded:
            evt.update({"type": "payment_refunded", "title": "Payment refunded", "detail": f"₹{p.amount:,.0f}", "icon": "rotate-ccw", "severity": "warning"})
        events.append(evt)

    # Sort by timestamp descending (most recent first)
    events.sort(key=lambda e: e["ts"], reverse=True)
    return events
