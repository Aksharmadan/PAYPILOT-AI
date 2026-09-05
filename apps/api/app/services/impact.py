from datetime import datetime, timedelta

from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.models.revenue import (
    RecoveryAttempt,
    RecoveryStatus,
    RecoveryOpportunity,
    ActionStatus,
    PolicyStatus,
)


def get_business_impact(db: Session) -> dict:
    """
    Compute high-level business impact metrics for the recovery system.

    Returns a dict with:
    - total_recovered: total amount recovered from successful recovery attempts
    - total_attempts: total number of recovery attempts
    - successful_attempts: number of attempts with status == recovered
    - total_at_risk: total amount at risk across all opportunities
    - organic_baseline: estimated organic recovery without the system (12% of total_at_risk)
    - incremental_lift: additional recovery above the organic baseline (floored at 0)
    - automation_rate: fraction of opportunities handled automatically (policy_status == auto)
    - avg_time_to_recovery_hours: average hours from attempt creation to resolution for successful attempts
    """

    # 1. total_recovered
    total_recovered = (
        db.query(func.coalesce(func.sum(RecoveryAttempt.recovered_amount), 0.0))
        .filter(RecoveryAttempt.status == RecoveryStatus.succeeded)
        .scalar()
    ) or 0.0

    # 2. total_attempts
    total_attempts = db.query(func.count(RecoveryAttempt.id)).scalar() or 0

    # 3. successful_attempts
    successful_attempts = (
        db.query(func.count(RecoveryAttempt.id))
        .filter(RecoveryAttempt.status == RecoveryStatus.succeeded)
        .scalar()
    ) or 0

    # 4. total_at_risk
    total_at_risk = (
        db.query(func.coalesce(func.sum(RecoveryOpportunity.amount_at_risk), 0.0))
        .scalar()
    ) or 0.0

    # 5. organic_baseline
    organic_baseline = total_at_risk * 0.12

    # 6. incremental_lift (floor at 0)
    incremental_lift = max(0.0, total_recovered - organic_baseline)

    # 7. automation_rate
    total_opps = db.query(func.count(RecoveryOpportunity.id)).scalar() or 0
    auto_opps = (
        db.query(func.count(RecoveryOpportunity.id))
        .filter(RecoveryOpportunity.policy_status == PolicyStatus.auto)
        .scalar()
    ) or 0
    automation_rate = (auto_opps / total_opps) if total_opps > 0 else 0.0

    # 8. avg_time_to_recovery_hours
    # Pull resolved successful attempts with both timestamps set
    resolved_rows = (
        db.query(RecoveryAttempt.created_at, RecoveryAttempt.resolved_at)
        .filter(
            RecoveryAttempt.status == RecoveryStatus.succeeded,
            RecoveryAttempt.resolved_at.isnot(None),
        )
        .all()
    )

    if resolved_rows:
        total_hours = sum(
            (row.resolved_at - row.created_at).total_seconds() / 3600.0
            for row in resolved_rows
        )
        avg_time_to_recovery_hours = round(total_hours / len(resolved_rows), 2)
    else:
        avg_time_to_recovery_hours = None

    return {
        "total_recovered": round(total_recovered, 2),
        "total_attempts": total_attempts,
        "successful_attempts": successful_attempts,
        "total_at_risk": round(total_at_risk, 2),
        "organic_baseline": round(organic_baseline, 2),
        "incremental_lift": round(incremental_lift, 2),
        "automation_rate": round(automation_rate, 4),
        "avg_time_to_recovery_hours": avg_time_to_recovery_hours,
    }
