"""
Phase 5 — tool definitions the AI Copilot can call.
Each tool queries real data through existing services; the model never
sees or invents numbers directly, it only sees what these functions return.
"""
from sqlalchemy.orm import Session

from app.models.revenue import Payment, PaymentStatus, Customer, Subscription, SubscriptionStatus
from app.api.routes.risk import compute_high_confidence_total, _customer_ids_with_prior_recovery_success
from app.services.risk_scoring import score_payment, score_checkout, classify
from app.models.revenue import CheckoutSession, CheckoutStatus
from sqlalchemy import func
from datetime import datetime, timedelta
from app.models.revenue import RecoveryOpportunity
from app.services.opportunity_engine import refresh_opportunities, serialize_opportunity

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_revenue_summary",
            "description": "Get total revenue, revenue at risk, and recovered revenue over a trailing window of days.",
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {"type": "integer", "description": "Trailing window in days, default 180"}
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_risk_distribution",
            "description": "Get the count and amount of failed payments/abandoned checkouts broken down by high/medium/low recovery confidence.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_customers",
            "description": "Search customers by name or email substring, or list top customers by lifetime value.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Optional name/email substring to search"},
                    "limit": {"type": "integer", "description": "Max results, default 5"},
                },
            },
        },
    },
]


def _run_get_revenue_summary(db: Session, days: int = 180):
    since = datetime.utcnow() - timedelta(days=days)
    revenue = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
        Payment.status == PaymentStatus.succeeded, Payment.created_at >= since
    ).scalar()
    failed_amount = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
        Payment.status == PaymentStatus.failed
    ).scalar()
    abandoned_amount = db.query(func.coalesce(func.sum(CheckoutSession.amount), 0.0)).filter(
        CheckoutSession.status == CheckoutStatus.abandoned
    ).scalar()
    high_conf = compute_high_confidence_total(db)
    return {
        "revenue_in_period": round(revenue, 2),
        "period_days": days,
        "failed_payments_amount": round(failed_amount, 2),
        "abandoned_checkouts_amount": round(abandoned_amount, 2),
        "high_confidence_recoverable": high_conf,
    }


def _run_get_risk_distribution(db: Session):
    customers_by_id = {c.id: c for c in db.query(Customer).all()}
    prior_success = _customer_ids_with_prior_recovery_success(db)
    failed = db.query(Payment).filter(Payment.status == PaymentStatus.failed).all()
    abandoned = db.query(CheckoutSession).filter(CheckoutSession.status == CheckoutStatus.abandoned).all()

    counts = {"high": 0, "medium": 0, "low": 0}
    amounts = {"high": 0.0, "medium": 0.0, "low": 0.0}

    for p in failed:
        s = score_payment(p, customers_by_id.get(p.customer_id), p.customer_id in prior_success)
        c = classify(s)
        counts[c] += 1
        amounts[c] += p.amount

    for chk in abandoned:
        c = classify(score_checkout(chk))
        counts[c] += 1
        amounts[c] += chk.amount

    return {
        "counts": counts,
        "amounts": {k: round(v, 2) for k, v in amounts.items()},
    }


def _run_search_customers(db: Session, query: str = "", limit: int = 5):
    q = db.query(Customer)
    if query:
        like = f"%{query}%"
        q = q.filter((Customer.name.ilike(like)) | (Customer.email.ilike(like)))
    rows = q.order_by(Customer.lifetime_value.desc()).limit(limit).all()
    return [
        {
            "name": c.name,
            "email": c.email,
            "plan": c.plan,
            "lifetime_value": c.lifetime_value,
            "churn_risk_score": c.churn_risk_score,
        }
        for c in rows
    ]


def _run_get_recovery_opportunities(db: Session, limit: int = 5, confidence: str | None = None):
    refresh_opportunities(db)
    q = db.query(RecoveryOpportunity)
    if confidence:
        q = q.filter(RecoveryOpportunity.confidence == confidence)
    rows = q.order_by(RecoveryOpportunity.expected_recovery_value.desc()).limit(limit).all()
    return [
        {
            "id": str(opp.id),
            "source": opp.source.value,
            "amount_at_risk": opp.amount_at_risk,
            "recovery_probability": opp.recovery_probability,
            "intervention_success_probability": opp.intervention_success_probability,
            "expected_recovery_value": opp.expected_recovery_value,
            "priority": opp.priority.value,
            "confidence": opp.confidence.value,
            "recommended_intervention": opp.recommended_intervention.value,
            "policy_status": opp.policy_status.value,
            "action_status": opp.action_status.value,
            "reason_codes": serialize_opportunity(opp)["reason_codes"],
        }
        for opp in rows
    ]


def _run_validate_recovery_action(db: Session, opportunity_id: str):
    opp = db.query(RecoveryOpportunity).filter(RecoveryOpportunity.id == opportunity_id).first()
    if not opp:
        return {"error": "opportunity not found"}
    serialized = serialize_opportunity(opp)
    return {
        "opportunity_id": str(opp.id),
        "policy_status": serialized["policy_status"],
        "policy_version": serialized["policy_version"],
        "policy_checks": serialized["policy_checks"],
        "recommended_intervention": serialized["recommended_intervention"],
        "action_status": serialized["action_status"],
    }


def execute_tool(db: Session, name: str, tool_input: dict):
    if name == "get_revenue_summary":
        return _run_get_revenue_summary(db, tool_input.get("days", 180))
    if name == "get_risk_distribution":
        return _run_get_risk_distribution(db)
    if name == "search_customers":
        return _run_search_customers(db, tool_input.get("query", ""), tool_input.get("limit", 5))
    if name == "get_recovery_opportunities":
        return _run_get_recovery_opportunities(db, tool_input.get("limit", 5), tool_input.get("confidence"))
    if name == "validate_recovery_action":
        return _run_validate_recovery_action(db, tool_input.get("opportunity_id"))
    return {"error": f"unknown tool {name}"}
