"""
Tool definitions the AI Copilot can call.
Each tool queries real data; the model never invents numbers.
"""
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.routes.risk import compute_high_confidence_total
from app.models.revenue import (
    CheckoutSession,
    CheckoutStatus,
    Customer,
    Payment,
    PaymentStatus,
    RecoveryOpportunity,
    Subscription,
    SubscriptionStatus,
    ActionStatus,
)
from app.models.experiment import Experiment
from app.services.experiment_engine import compute_results
from app.services.leak_detector import detect_leaks
from app.services.opportunity_engine import serialize_opportunity

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
            "description": "Get opportunity confidence mix from the recovery queue (high/medium/low).",
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
    {
        "type": "function",
        "function": {
            "name": "get_recovery_opportunities",
            "description": "List top recovery opportunities by expected recovery value.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "Max results, default 5"},
                    "confidence": {
                        "type": "string",
                        "description": "Optional filter: high, medium, or low",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "validate_recovery_action",
            "description": "Explain why an opportunity is auto / approval_required / escalated / blocked.",
            "parameters": {
                "type": "object",
                "properties": {
                    "opportunity_id": {"type": "string", "description": "Opportunity UUID"},
                },
                "required": ["opportunity_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_active_experiments",
            "description": "List all active or completed revenue experiments.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_experiment_results",
            "description": "Calculate and get results (lift, n, recovery rates) for a specific experiment ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "experiment_id": {"type": "string", "description": "Experiment UUID"},
                },
                "required": ["experiment_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_revenue_leaks",
            "description": "Scan and return anomalous revenue leaks and recommend recovery actions.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_failed_payments",
            "description": "Get failed payments with failure reasons and customer details.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "Max payments, default 5"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_past_due_subscriptions",
            "description": "List subscriptions that are currently past due and at risk of churning.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "Max subscriptions, default 5"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "approve_recovery_opportunity",
            "description": "Approve a pending recovery opportunity to initiate intervention.",
            "parameters": {
                "type": "object",
                "properties": {
                    "opportunity_id": {"type": "string", "description": "Opportunity UUID"},
                },
                "required": ["opportunity_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "dismiss_recovery_opportunity",
            "description": "Dismiss a recovery opportunity and exclude it from retry queues.",
            "parameters": {
                "type": "object",
                "properties": {
                    "opportunity_id": {"type": "string", "description": "Opportunity UUID"},
                },
                "required": ["opportunity_id"],
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
    rows = (
        db.query(RecoveryOpportunity.confidence, func.count(RecoveryOpportunity.id), func.coalesce(func.sum(RecoveryOpportunity.amount_at_risk), 0.0))
        .group_by(RecoveryOpportunity.confidence)
        .all()
    )
    counts = {"high": 0, "medium": 0, "low": 0}
    amounts = {"high": 0.0, "medium": 0.0, "low": 0.0}
    for confidence, count, amount in rows:
        key = confidence.value if hasattr(confidence, "value") else str(confidence)
        if key in counts:
            counts[key] = int(count)
            amounts[key] = round(float(amount), 2)
    return {"counts": counts, "amounts": amounts}


def _run_search_customers(db: Session, query: str = "", limit: int = 5):
    q = db.query(Customer)
    if query:
        like = f"%{query}%"
        q = q.filter((Customer.name.ilike(like)) | (Customer.email.ilike(like)))
    rows = q.order_by(Customer.lifetime_value.desc()).limit(limit).all()
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "email": c.email,
            "plan": c.plan,
            "lifetime_value": c.lifetime_value,
            "churn_risk_score": c.churn_risk_score,
        }
        for c in rows
    ]


def _run_get_recovery_opportunities(db: Session, limit: int = 5, confidence: str | None = None):
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
            "expected_recovery_value": opp.expected_recovery_value,
            "priority": opp.priority.value,
            "confidence": opp.confidence.value,
            "recommended_intervention": opp.recommended_intervention.value,
            "policy_status": opp.policy_status.value,
            "action_status": opp.action_status.value,
            "reason_codes": serialize_opportunity(opp)["reason_codes"],
            "href": f"/revenue/opportunities?id={opp.id}",
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


def _run_get_active_experiments(db: Session):
    rows = db.query(Experiment).all()
    return [
        {
            "id": str(e.id),
            "name": e.name,
            "status": e.status.value if hasattr(e.status, "value") else str(e.status),
            "started_at": e.started_at.isoformat() if e.started_at else None,
            "ended_at": e.ended_at.isoformat() if e.ended_at else None,
        }
        for e in rows
    ]


def _run_get_experiment_results(db: Session, experiment_id: str):
    e = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not e:
        return {"error": f"Experiment with id {experiment_id} not found."}
    return compute_results(db, e)


def _run_get_revenue_leaks(db: Session):
    return detect_leaks(db)


def _run_get_failed_payments(db: Session, limit: int = 5):
    rows = (
        db.query(Payment)
        .filter(Payment.status == PaymentStatus.failed)
        .order_by(Payment.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": str(p.id),
            "amount": p.amount,
            "failure_reason": p.failure_reason,
            "created_at": p.created_at.isoformat(),
            "customer_id": str(p.customer_id),
        }
        for p in rows
    ]


def _run_get_past_due_subscriptions(db: Session, limit: int = 5):
    rows = (
        db.query(Subscription)
        .filter(Subscription.status == SubscriptionStatus.past_due)
        .order_by(Subscription.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": str(s.id),
            "plan_name": s.plan_name,
            "mrr": s.mrr,
            "current_period_end": s.current_period_end.isoformat(),
            "customer_id": str(s.customer_id),
        }
        for s in rows
    ]


def _run_approve_recovery_opportunity(db: Session, opportunity_id: str):
    opp = db.query(RecoveryOpportunity).filter(RecoveryOpportunity.id == opportunity_id).first()
    if not opp:
        return {"success": False, "error": f"Opportunity {opportunity_id} not found."}
    if opp.action_status not in (ActionStatus.open,):
        return {
            "success": False,
            "error": f"Opportunity {opportunity_id} is already in status '{opp.action_status.value}'. Only open opportunities can be approved.",
        }
    if opp.policy_status.value == "blocked":
        return {"success": False, "error": f"Opportunity {opportunity_id} is policy-blocked and cannot be approved."}
    opp.action_status = ActionStatus.approved
    opp.updated_at = datetime.utcnow()
    db.commit()
    return {
        "success": True,
        "message": f"Opportunity {opportunity_id} approved. It is now queued for execution.",
        "action_status": "approved",
    }


def _run_dismiss_recovery_opportunity(db: Session, opportunity_id: str):
    opp = db.query(RecoveryOpportunity).filter(RecoveryOpportunity.id == opportunity_id).first()
    if not opp:
        return {"success": False, "error": f"Opportunity {opportunity_id} not found."}
    if opp.action_status in (ActionStatus.completed, ActionStatus.failed):
        return {
            "success": False,
            "error": f"Opportunity {opportunity_id} is already resolved (status: {opp.action_status.value}).",
        }
    opp.action_status = ActionStatus.rejected
    opp.updated_at = datetime.utcnow()
    db.commit()
    return {
        "success": True,
        "message": f"Opportunity {opportunity_id} dismissed and removed from recovery queues.",
        "action_status": "rejected",
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
    if name == "get_active_experiments":
        return _run_get_active_experiments(db)
    if name == "get_experiment_results":
        return _run_get_experiment_results(db, tool_input.get("experiment_id"))
    if name == "get_revenue_leaks":
        return _run_get_revenue_leaks(db)
    if name == "get_failed_payments":
        return _run_get_failed_payments(db, tool_input.get("limit", 5))
    if name == "get_past_due_subscriptions":
        return _run_get_past_due_subscriptions(db, tool_input.get("limit", 5))
    if name == "approve_recovery_opportunity":
        return _run_approve_recovery_opportunity(db, tool_input.get("opportunity_id"))
    if name == "dismiss_recovery_opportunity":
        return _run_dismiss_recovery_opportunity(db, tool_input.get("opportunity_id"))
    return {"error": f"unknown tool {name}"}
