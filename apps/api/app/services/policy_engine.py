from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.revenue import PolicyStatus, RecoveryAttempt, Payment, Customer

def _contact_count(db: Session, customer_id) -> int:
    if not customer_id:
        return 0
    return (
        db.query(RecoveryAttempt)
        .join(Payment, RecoveryAttempt.payment_id == Payment.id, isouter=True)
        .filter(Payment.customer_id == customer_id)
        .count()
    )

def evaluate_policy(db: Session, source: str, amount: float, score: dict, payment: Payment | None = None, customer_id=None):
    from app.models.policy import MerchantPolicy
    
    # Query merchant policy, default to constants if not present
    policy = db.query(MerchantPolicy).first()
    
    max_retry_count = policy.max_retry_count if policy else 3
    retry_cooldown_hours = policy.retry_cooldown_hours if policy else 12
    auto_amount_limit = policy.auto_amount_limit if policy else 5000.0
    approval_amount_limit = policy.approval_amount_limit if policy else 25000.0
    contact_limit_per_customer = policy.contact_limit_per_customer if policy else 3
    min_confidence_for_auto = policy.min_confidence_for_auto if policy else 0.7

    checks = []

    def add(name: str, passed: bool, detail: str):
        checks.append({"name": name, "passed": passed, "detail": detail})

    intervention = score["recommended_intervention"]
    recoverable_action = intervention != "no_action"
    add("recoverable_action", recoverable_action, f"recommended intervention is {intervention}")

    if payment is not None:
        add("retry_count", payment.retry_count < max_retry_count, f"{payment.retry_count}/{max_retry_count} retries used")
        latest_attempt = (
            db.query(RecoveryAttempt)
            .filter(RecoveryAttempt.payment_id == payment.id)
            .order_by(RecoveryAttempt.created_at.desc())
            .first()
        )
        cooldown_ok = not latest_attempt or latest_attempt.created_at <= datetime.utcnow() - timedelta(hours=retry_cooldown_hours)
        add("retry_cooldown", cooldown_ok, f"{retry_cooldown_hours}h cooldown")

    contact_count = _contact_count(db, customer_id)
    add("contact_limit", contact_count < contact_limit_per_customer, f"{contact_count}/{contact_limit_per_customer} recent contacts")
    add("amount_threshold", True, f"amount {amount:.2f}; escalation threshold {approval_amount_limit}")

    if not all(c["passed"] for c in checks):
        return PolicyStatus.blocked, checks
    if score["confidence"] == "high" and amount <= auto_max_amount_check(auto_amount_limit) and score["recovery_probability"] >= min_confidence_for_auto:
        return PolicyStatus.auto, checks
    if amount > approval_amount_limit or score["priority"] == "critical":
        return PolicyStatus.escalated, checks
    return PolicyStatus.approval_required, checks

def auto_max_amount_check(limit: float) -> float:
    return limit

def evaluate_policy_custom(
    amount: float,
    retry_count: int,
    failure_reason: str | None,
    score: float,
    last_attempt_at: datetime | None = None,
    max_retries: int = 2,
    auto_max_amount: float = 5000.0,
    min_confidence_for_auto: float = 0.70,
    min_retry_interval_minutes: int = 30,
):
    checks = []
    
    # 1. Recoverable check: if fraud_suspected, it's not eligible
    is_recoverable = failure_reason != "fraud_suspected"
    checks.append({"name": "recoverable_action", "passed": is_recoverable, "detail": "not fraud"})
    
    # 2. Retry limit check
    retry_ok = retry_count < max_retries
    checks.append({"name": "retry_count", "passed": retry_ok, "detail": f"{retry_count}/{max_retries} used"})
    
    # 3. Cooldown check
    cooldown_ok = True
    if last_attempt_at is not None:
        if last_attempt_at.tzinfo is None:
            last_attempt_at = last_attempt_at.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        cooldown_ok = (now - last_attempt_at).total_seconds() >= (min_retry_interval_minutes * 60)
    checks.append({"name": "retry_cooldown", "passed": cooldown_ok, "detail": f"{min_retry_interval_minutes}m cooldown"})
    
    # Check if eligible (all checks passed)
    eligible = is_recoverable and retry_ok and cooldown_ok
    
    if not eligible:
        return False, checks, "blocked"
        
    # Tier classification
    if score >= min_confidence_for_auto and amount <= auto_max_amount:
        return True, checks, "auto"
    elif amount > 25000.0 or score < 0.2:
        return True, checks, "escalate"
    else:
        return True, checks, "approval"
