"""Explainable daily failure-rate anomaly check (no ML library)."""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.revenue import Payment, PaymentStatus


def detect_failure_rate_anomaly(db: Session, lookback_days: int = 14, z_threshold: float = 2.0) -> dict:
    """Flag when today's failure rate exceeds trailing mean by z_threshold σ."""
    today = datetime.utcnow().date()
    start = today - timedelta(days=lookback_days)

    day_stats: list[tuple] = []
    cursor = start
    while cursor <= today:
        day_start = datetime.combine(cursor, datetime.min.time())
        day_end = day_start + timedelta(days=1)
        total = (
            db.query(func.count(Payment.id))
            .filter(Payment.created_at >= day_start, Payment.created_at < day_end)
            .scalar()
            or 0
        )
        failed = (
            db.query(func.count(Payment.id))
            .filter(
                Payment.created_at >= day_start,
                Payment.created_at < day_end,
                Payment.status == PaymentStatus.failed,
            )
            .scalar()
            or 0
        )
        rate = (failed / total) if total else None
        day_stats.append((cursor, total, failed, rate))
        cursor += timedelta(days=1)

    baseline = [r for (d, total, _failed, r) in day_stats if d < today and r is not None and total >= 5]
    today_row = next((x for x in day_stats if x[0] == today), None)
    today_rate = today_row[3] if today_row else None
    today_total = today_row[1] if today_row else 0
    today_failed = today_row[2] if today_row else 0

    if len(baseline) < 5 or today_rate is None or today_total < 5:
        return {
            "active": False,
            "reason": "insufficient_data",
            "today_failure_rate": today_rate,
            "baseline_mean": None,
            "baseline_std": None,
            "z_score": None,
            "threshold": z_threshold,
            "today_failed": today_failed,
            "today_total": today_total,
            "lookback_days": lookback_days,
            "message": "Not enough recent payment volume to evaluate an anomaly.",
        }

    mean = sum(baseline) / len(baseline)
    variance = sum((x - mean) ** 2 for x in baseline) / len(baseline)
    std = variance ** 0.5
    z = (today_rate - mean) / std if std > 1e-9 else 0.0
    active = z >= z_threshold

    return {
        "active": active,
        "reason": "failure_rate_spike" if active else "within_normal_range",
        "today_failure_rate": round(today_rate, 4),
        "baseline_mean": round(mean, 4),
        "baseline_std": round(std, 4),
        "z_score": round(z, 3),
        "threshold": z_threshold,
        "today_failed": today_failed,
        "today_total": today_total,
        "lookback_days": lookback_days,
        "message": (
            f"Today's payment failure rate ({today_rate:.1%}) is {z:.1f}σ above the "
            f"{lookback_days}-day average ({mean:.1%})."
            if active
            else f"Failure rate ({today_rate:.1%}) within normal range vs {lookback_days}-day mean ({mean:.1%})."
        ),
    }
