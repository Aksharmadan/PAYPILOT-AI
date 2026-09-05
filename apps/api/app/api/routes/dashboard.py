"""Purpose-built Command Center payload — one round-trip instead of N."""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_merchant
from app.api.routes.revenue import revenue_at_risk
from app.api.routes.risk import compute_high_confidence_total
from app.core.database import get_db
from app.models.merchant import Merchant
from app.models.revenue import (
    ActionStatus,
    Customer,
    OpportunityOutcome,
    Payment,
    PaymentStatus,
    RecoveryAttempt,
    RecoveryOpportunity,
    RecoveryStatus,
)
from app.schemas.revenue import (
    DashboardBriefingOut,
    DashboardOpportunityCard,
    DashboardSummaryOut,
)
from app.services.opportunity_engine import serialize_opportunity

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryOut)
def dashboard_summary(
    days: int = Query(180, ge=1, le=365),
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    since = datetime.utcnow() - timedelta(days=days)
    prev_since = since - timedelta(days=days)

    revenue_period = (
        db.query(func.coalesce(func.sum(Payment.amount), 0.0))
        .filter(Payment.status == PaymentStatus.succeeded, Payment.created_at >= since)
        .scalar()
        or 0.0
    )
    previous_revenue = (
        db.query(func.coalesce(func.sum(Payment.amount), 0.0))
        .filter(
            Payment.status == PaymentStatus.succeeded,
            Payment.created_at >= prev_since,
            Payment.created_at < since,
        )
        .scalar()
        or 0.0
    )
    revenue_delta_pct = None
    if previous_revenue > 0:
        revenue_delta_pct = round(((revenue_period - previous_revenue) / previous_revenue) * 100, 1)

    at_risk = revenue_at_risk(db=db, _=None)
    recovered_period = (
        db.query(func.coalesce(func.sum(RecoveryAttempt.recovered_amount), 0.0))
        .filter(RecoveryAttempt.status == RecoveryStatus.succeeded, RecoveryAttempt.created_at >= since)
        .scalar()
        or 0.0
    )
    attempted = (
        db.query(func.count(RecoveryAttempt.id))
        .filter(RecoveryAttempt.created_at >= since)
        .filter(RecoveryAttempt.status.in_([RecoveryStatus.succeeded, RecoveryStatus.failed]))
        .scalar()
        or 0
    )
    succeeded = (
        db.query(func.count(RecoveryAttempt.id))
        .filter(RecoveryAttempt.created_at >= since, RecoveryAttempt.status == RecoveryStatus.succeeded)
        .scalar()
        or 0
    )
    recovery_rate = round(succeeded / attempted, 4) if attempted else None

    open_statuses = (ActionStatus.open, ActionStatus.approved, ActionStatus.executing)
    active_opportunities = (
        db.query(func.count(RecoveryOpportunity.id))
        .filter(RecoveryOpportunity.outcome == OpportunityOutcome.pending)
        .filter(RecoveryOpportunity.action_status.in_(open_statuses))
        .scalar()
        or 0
    )
    expected_recovery = (
        db.query(func.coalesce(func.sum(RecoveryOpportunity.expected_recovery_value), 0.0))
        .filter(RecoveryOpportunity.outcome == OpportunityOutcome.pending)
        .filter(RecoveryOpportunity.action_status.in_(open_statuses))
        .scalar()
        or 0.0
    )

    failed_period = (
        db.query(func.coalesce(func.sum(Payment.amount), 0.0))
        .filter(Payment.status == PaymentStatus.failed, Payment.created_at >= since)
        .scalar()
        or 0.0
    )
    total_period = revenue_period + failed_period
    if total_period > 0:
        health_score = max(40, min(100, round((revenue_period / total_period) * 100)))
    else:
        health_score = 83

    top_rows = (
        db.query(RecoveryOpportunity)
        .filter(RecoveryOpportunity.outcome == OpportunityOutcome.pending)
        .filter(RecoveryOpportunity.action_status.in_(open_statuses))
        .order_by(RecoveryOpportunity.expected_recovery_value.desc())
        .limit(5)
        .all()
    )
    customers = {}
    ids = {o.customer_id for o in top_rows if o.customer_id}
    if ids:
        customers = {c.id: c for c in db.query(Customer).filter(Customer.id.in_(ids)).all()}

    top_opportunities = []
    for opp in top_rows:
        serialized = serialize_opportunity(opp, customers.get(opp.customer_id))
        top_opportunities.append(
            DashboardOpportunityCard(
                id=opp.id,
                title=_opportunity_title(serialized),
                source=serialized["source"],
                amount_at_risk=serialized["amount_at_risk"],
                recovery_probability=serialized["recovery_probability"],
                expected_recovery_value=serialized["expected_recovery_value"],
                confidence=serialized["confidence"],
                recommended_intervention=serialized["recommended_intervention"],
                href=f"/revenue/opportunities?id={opp.id}",
            )
        )

    # Briefing insights from real aggregates — never invented percentages.
    insights: list[str] = []
    dominant = max(at_risk.by_source, key=lambda s: s.amount) if at_risk.by_source else None
    if dominant and at_risk.total_at_risk > 0:
        share = round((dominant.amount / at_risk.total_at_risk) * 100)
        insights.append(f"{share}% of at-risk revenue is from {dominant.source}.")
    if top_opportunities:
        best = top_opportunities[0]
        insights.append(
            f"Top opportunity: {best.title} — ₹{best.expected_recovery_value:,.0f} expected recovery."
        )
    high_conf = compute_high_confidence_total(db)
    if high_conf > 0:
        insights.append(f"₹{high_conf:,.0f} high-confidence recovery is waiting in the queue.")
    if recovery_rate is not None:
        insights.append(f"Recovery success rate over {days}d is {recovery_rate * 100:.1f}% ({succeeded}/{attempted}).")

    return DashboardSummaryOut(
        period_days=days,
        revenue_period=round(float(revenue_period), 2),
        previous_revenue_period=round(float(previous_revenue), 2),
        revenue_delta_pct=revenue_delta_pct,
        revenue_health_score=health_score,
        revenue_at_risk=at_risk.total_at_risk,
        by_source=at_risk.by_source,
        expected_recovery=round(float(expected_recovery), 2),
        high_confidence_recoverable=high_conf,
        recovered_period=round(float(recovered_period), 2),
        recovery_rate=recovery_rate,
        active_opportunities=active_opportunities,
        top_opportunities=top_opportunities,
        briefing=DashboardBriefingOut(
            headline="Your revenue engine is healthy." if health_score >= 70 else "Revenue needs attention.",
            insights=insights[:4],
        ),
    )


def _opportunity_title(serialized: dict) -> str:
    source = serialized.get("source")
    name = serialized.get("customer_name")
    if source == "payment":
        return f"Failed payment — {name}" if name else "Failed payment"
    if source == "checkout":
        return f"Checkout abandonment — {name}" if name else "Checkout abandonment"
    if source == "subscription":
        return f"Past-due subscription — {name}" if name else "Past-due subscription"
    return name or "Recovery opportunity"
