"""
PayPilot Recommends -- groups undecided recovery opportunities into ranked
categories by expected recovery value. Reuses the already-tested database
tables to determine recovery potential.
"""
import json
from sqlalchemy.orm import Session
from app.models.revenue import RecoveryOpportunity, PolicyStatus, ActionStatus


def get_recommendations(db: Session, limit: int = 5) -> list[dict]:
    items = (
        db.query(RecoveryOpportunity)
        .filter(RecoveryOpportunity.action_status == ActionStatus.open)
        .filter(RecoveryOpportunity.policy_status != PolicyStatus.blocked)
        .all()
    )
    
    groups: dict[str, dict] = {}

    for item in items:
        # Safely parse JSON supporting evidence
        evidence = {}
        if item.supporting_evidence:
            try:
                evidence = json.loads(item.supporting_evidence)
            except Exception:
                pass
                
        # Determine source categorization
        source_val = item.source.value if hasattr(item.source, "value") else str(item.source)
        if source_val == "payment":
            failure_reason = evidence.get("failure_reason", "failed") if isinstance(evidence, dict) else "failed"
            key = f"Recover failed {failure_reason.replace('_', ' ')} payments"
        elif source_val == "subscription":
            key = "Recover failed subscriptions"
        else:
            key = "Recover checkout abandonments"
            
        g = groups.setdefault(key, {"title": key, "count": 0, "amount_at_risk": 0.0, "expected_recovery": 0.0, "scores": []})
        g["count"] += 1
        g["amount_at_risk"] += item.amount_at_risk
        g["expected_recovery"] += item.expected_recovery_value
        g["scores"].append(item.recovery_probability)

    recs = []
    for g in groups.values():
        avg_prob = sum(g["scores"]) / len(g["scores"]) if g["scores"] else 0
        recs.append({
            "title": g["title"],
            "amount_at_risk": round(g["amount_at_risk"], 2),
            "avg_probability": round(avg_prob, 3),
            "expected_recovery": round(g["expected_recovery"], 2),
            "count": g["count"],
        })

    recs.sort(key=lambda r: r["expected_recovery"], reverse=True)
    return recs[:limit]
