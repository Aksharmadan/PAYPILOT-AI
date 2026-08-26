import hashlib
import json
import uuid
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.revenue import (
    ActionStatus,
    CheckoutSession,
    CheckoutStatus,
    Customer,
    GroundTruthScenario,
    InterventionType,
    OpportunityOutcome,
    OpportunitySource,
    Payment,
    PaymentStatus,
    PolicyStatus,
    RecoveryAttempt,
    RecoveryMethod,
    RecoveryOpportunity,
    RecoveryStatus,
    RevenueEvent,
    Subscription,
    SubscriptionStatus,
)
from app.services.risk_scoring import (
    score_checkout_opportunity,
    score_payment_opportunity,
    score_subscription_opportunity,
)

POLICY_VERSION = "policy_v1"
MAX_RETRY_COUNT = 3
RETRY_COOLDOWN_HOURS = 12
AUTO_AMOUNT_LIMIT = 5000
APPROVAL_AMOUNT_LIMIT = 25000
CONTACT_LIMIT_PER_CUSTOMER = 3


def _json(value) -> str:
    return json.dumps(value, default=str)


def _loads(value, fallback):
    if not value:
        return fallback
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


def serialize_opportunity(opp: RecoveryOpportunity, customer: Customer | None = None) -> dict:
    return {
        "id": opp.id,
        "source": opp.source.value,
        "customer_id": opp.customer_id,
        "customer_name": customer.name if customer else None,
        "customer_email": customer.email if customer else None,
        "payment_id": opp.payment_id,
        "checkout_session_id": opp.checkout_session_id,
        "subscription_id": opp.subscription_id,
        "amount_at_risk": opp.amount_at_risk,
        "recovery_probability": opp.recovery_probability,
        "intervention_success_probability": opp.intervention_success_probability,
        "expected_recovery_value": opp.expected_recovery_value,
        "priority": opp.priority.value,
        "confidence": opp.confidence.value,
        "recommended_intervention": opp.recommended_intervention.value,
        "reason_codes": _loads(opp.reason_codes, []),
        "supporting_evidence": _loads(opp.supporting_evidence, {}),
        "policy_status": opp.policy_status.value,
        "policy_version": opp.policy_version,
        "policy_checks": _loads(opp.policy_checks, []),
        "action_status": opp.action_status.value,
        "outcome": opp.outcome.value,
        "created_at": opp.created_at,
        "updated_at": opp.updated_at,
        "executed_at": opp.executed_at,
    }


def record_event(
    db: Session,
    event_type: str,
    entity_type: str,
    entity_id,
    payload: dict,
    idempotency_key: str,
    correlation_id: str | None = None,
):
    existing = db.query(RevenueEvent).filter(RevenueEvent.idempotency_key == idempotency_key).first()
    if existing:
        return existing
    event = RevenueEvent(
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        payload=_json(payload),
        idempotency_key=idempotency_key,
        correlation_id=correlation_id or str(entity_id),
    )
    db.add(event)
    return event


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
    checks = []

    def add(name: str, passed: bool, detail: str):
        checks.append({"name": name, "passed": passed, "detail": detail})

    intervention = score["recommended_intervention"]
    recoverable_action = intervention != InterventionType.no_action.value and intervention != "no_action"
    add("recoverable_action", recoverable_action, f"recommended intervention is {intervention}")

    if payment is not None:
        add("retry_count", payment.retry_count < MAX_RETRY_COUNT, f"{payment.retry_count}/{MAX_RETRY_COUNT} retries used")
        latest_attempt = (
            db.query(RecoveryAttempt)
            .filter(RecoveryAttempt.payment_id == payment.id)
            .order_by(RecoveryAttempt.created_at.desc())
            .first()
        )
        cooldown_ok = not latest_attempt or latest_attempt.created_at <= datetime.utcnow() - timedelta(hours=RETRY_COOLDOWN_HOURS)
        add("retry_cooldown", cooldown_ok, f"{RETRY_COOLDOWN_HOURS}h cooldown")

    contact_count = _contact_count(db, customer_id)
    add("contact_limit", contact_count < CONTACT_LIMIT_PER_CUSTOMER, f"{contact_count}/{CONTACT_LIMIT_PER_CUSTOMER} recent contacts")
    add("amount_threshold", True, f"amount {amount:.2f}; escalation threshold {APPROVAL_AMOUNT_LIMIT}")

    if not all(c["passed"] for c in checks):
        return PolicyStatus.blocked, checks
    if score["confidence"] == "high" and amount <= AUTO_AMOUNT_LIMIT and score["recovery_probability"] >= 0.7:
        return PolicyStatus.auto, checks
    if amount > APPROVAL_AMOUNT_LIMIT or score["priority"] == "critical":
        return PolicyStatus.escalated, checks
    return PolicyStatus.approval_required, checks


def _truth_for_opportunity(db: Session, opp: RecoveryOpportunity) -> GroundTruthScenario | None:
    if opp.payment_id:
        return db.query(GroundTruthScenario).filter(GroundTruthScenario.payment_id == opp.payment_id).first()
    if opp.checkout_session_id:
        return db.query(GroundTruthScenario).filter(GroundTruthScenario.checkout_session_id == opp.checkout_session_id).first()
    if opp.subscription_id:
        return db.query(GroundTruthScenario).filter(GroundTruthScenario.subscription_id == opp.subscription_id).first()
    return None


def _seeded_outcome(opp: RecoveryOpportunity, truth: GroundTruthScenario | None) -> tuple[bool, str | None]:
    if not truth:
        digest = hashlib.sha256(str(opp.id).encode()).hexdigest()
        draw = int(digest[:8], 16) / 0xFFFFFFFF
        return draw < 0.35, None if draw < 0.35 else "issuer_declined_after_retry"

    seed = f"{opp.id}:{truth.scenario_type}:{truth.dataset_split.value}"
    digest = hashlib.sha256(seed.encode()).hexdigest()
    draw = int(digest[:8], 16) / 0xFFFFFFFF
    scenario_probability = truth.outcome_probability
    if truth.expected_intervention and truth.expected_intervention == opp.recommended_intervention:
        scenario_probability += 0.05
    if truth.expected_policy_status and truth.expected_policy_status == opp.policy_status:
        scenario_probability += 0.03
    scenario_probability = max(min(scenario_probability, 0.98), 0.02)
    recovered = draw < scenario_probability and bool(truth.recoverable)
    return recovered, None if recovered else "scenario_outcome_not_recovered"


def _upsert(db: Session, lookup: dict, attrs: dict) -> RecoveryOpportunity:
    opp = db.query(RecoveryOpportunity).filter_by(**lookup).first()
    now = datetime.utcnow()
    if not opp:
        opp = RecoveryOpportunity(id=uuid.uuid4(), **lookup, created_at=now)
        db.add(opp)
    for key, value in attrs.items():
        setattr(opp, key, value)
    opp.updated_at = now
    if not db.query(RevenueEvent).filter(RevenueEvent.idempotency_key == f"opportunity_created:{next(iter(lookup.values()))}").first():
        record_event(
            db,
            "recovery.opportunity_created",
            "recovery_opportunity",
            opp.id,
            {"lookup": {k: str(v) for k, v in lookup.items()}},
            f"opportunity_created:{next(iter(lookup.values()))}",
            str(next(iter(lookup.values()))),
        )
    return opp


def refresh_opportunities(db: Session, limit: int = 1000) -> int:
    customers = {c.id: c for c in db.query(Customer).all()}
    recovered_payments = {
        row[0]
        for row in db.query(RecoveryAttempt.payment_id)
        .filter(RecoveryAttempt.status == RecoveryStatus.succeeded)
        .filter(RecoveryAttempt.payment_id.isnot(None))
        .all()
    }
    recovered_checkouts = {
        row[0]
        for row in db.query(RecoveryAttempt.checkout_session_id)
        .filter(RecoveryAttempt.status == RecoveryStatus.succeeded)
        .filter(RecoveryAttempt.checkout_session_id.isnot(None))
        .all()
    }
    recovered_subscriptions = {
        row[0]
        for row in db.query(RecoveryAttempt.subscription_id)
        .filter(RecoveryAttempt.status == RecoveryStatus.succeeded)
        .filter(RecoveryAttempt.subscription_id.isnot(None))
        .all()
    }
    prior_success_customers = {
        row[0]
        for row in db.query(Payment.customer_id)
        .join(RecoveryAttempt, RecoveryAttempt.payment_id == Payment.id)
        .filter(RecoveryAttempt.status == RecoveryStatus.succeeded)
        .distinct()
        .all()
    }

    changed = 0
    failed_payments = (
        db.query(Payment)
        .filter(Payment.status == PaymentStatus.failed)
        .filter(~Payment.id.in_(recovered_payments) if recovered_payments else True)
        .order_by(Payment.created_at.desc())
        .limit(limit)
        .all()
    )
    for payment in failed_payments:
        customer = customers.get(payment.customer_id)
        score = score_payment_opportunity(payment, customer, payment.customer_id in prior_success_customers)
        policy_status, checks = evaluate_policy(db, "payment", payment.amount, score, payment, payment.customer_id)
        _upsert(db, {"payment_id": payment.id}, {
            "source": OpportunitySource.payment,
            "customer_id": payment.customer_id,
            "amount_at_risk": payment.amount,
            "recovery_probability": score["recovery_probability"],
            "intervention_success_probability": score["intervention_success_probability"],
            "expected_recovery_value": score["expected_recovery_value"],
            "priority": score["priority"],
            "confidence": score["confidence"],
            "recommended_intervention": score["recommended_intervention"],
            "reason_codes": _json(score["reason_codes"]),
            "supporting_evidence": _json(score["supporting_evidence"]),
            "policy_status": policy_status,
            "policy_version": POLICY_VERSION,
            "policy_checks": _json(checks),
        })
        changed += 1

    abandoned_checkouts = (
        db.query(CheckoutSession)
        .filter(CheckoutSession.status == CheckoutStatus.abandoned)
        .filter(~CheckoutSession.id.in_(recovered_checkouts) if recovered_checkouts else True)
        .order_by(CheckoutSession.started_at.desc())
        .limit(limit)
        .all()
    )
    for checkout in abandoned_checkouts:
        customer = customers.get(checkout.customer_id)
        score = score_checkout_opportunity(checkout, customer)
        policy_status, checks = evaluate_policy(db, "checkout", checkout.amount, score, None, checkout.customer_id)
        _upsert(db, {"checkout_session_id": checkout.id}, {
            "source": OpportunitySource.checkout,
            "customer_id": checkout.customer_id,
            "amount_at_risk": checkout.amount,
            "recovery_probability": score["recovery_probability"],
            "intervention_success_probability": score["intervention_success_probability"],
            "expected_recovery_value": score["expected_recovery_value"],
            "priority": score["priority"],
            "confidence": score["confidence"],
            "recommended_intervention": score["recommended_intervention"],
            "reason_codes": _json(score["reason_codes"]),
            "supporting_evidence": _json(score["supporting_evidence"]),
            "policy_status": policy_status,
            "policy_version": POLICY_VERSION,
            "policy_checks": _json(checks),
        })
        changed += 1

    past_due_subs = (
        db.query(Subscription)
        .filter(Subscription.status == SubscriptionStatus.past_due)
        .filter(~Subscription.id.in_(recovered_subscriptions) if recovered_subscriptions else True)
        .order_by(Subscription.current_period_end.asc())
        .limit(limit)
        .all()
    )
    for sub in past_due_subs:
        customer = customers.get(sub.customer_id)
        failed_payment_count = (
            db.query(Payment)
            .filter(Payment.subscription_id == sub.id)
            .filter(Payment.status == PaymentStatus.failed)
            .count()
        )
        prior_successful_renewals = (
            db.query(Payment)
            .filter(Payment.subscription_id == sub.id)
            .filter(Payment.status == PaymentStatus.succeeded)
            .count()
        )
        score = score_subscription_opportunity(
            sub,
            customer,
            failed_payment_count=failed_payment_count,
            prior_successful_renewals=prior_successful_renewals,
        )
        policy_status, checks = evaluate_policy(db, "subscription", sub.mrr, score, None, sub.customer_id)
        _upsert(db, {"subscription_id": sub.id}, {
            "source": OpportunitySource.subscription,
            "customer_id": sub.customer_id,
            "amount_at_risk": sub.mrr,
            "recovery_probability": score["recovery_probability"],
            "intervention_success_probability": score["intervention_success_probability"],
            "expected_recovery_value": score["expected_recovery_value"],
            "priority": score["priority"],
            "confidence": score["confidence"],
            "recommended_intervention": score["recommended_intervention"],
            "reason_codes": _json(score["reason_codes"]),
            "supporting_evidence": _json(score["supporting_evidence"]),
            "policy_status": policy_status,
            "policy_version": POLICY_VERSION,
            "policy_checks": _json(checks),
        })
        changed += 1

    db.commit()
    return changed


def transition_opportunity(
    db: Session,
    opp: RecoveryOpportunity,
    action: str,
    merchant_email: str | None = None,
) -> RecoveryOpportunity:
    from app.models.audit import AuditDecision
    from app.core.logging import get_logger

    log = get_logger("paypilot.recovery")

    if action == "approve":
        opp.action_status = ActionStatus.approved
        event_type = "recovery.action_approved"
    elif action == "reject":
        opp.action_status = ActionStatus.rejected
        opp.outcome = OpportunityOutcome.no_action
        event_type = "recovery.action_rejected"
    else:
        raise ValueError("unsupported transition")
    opp.updated_at = datetime.utcnow()
    record_event(db, event_type, "recovery_opportunity", opp.id, {"action": action}, f"{event_type}:{opp.id}")
    db.add(
        AuditDecision(
            id=uuid.uuid4(),
            merchant_email=merchant_email or "system",
            opportunity_id=opp.id,
            decision=action,
            outcome=opp.outcome.value if opp.outcome else None,
            payload=_json(serialize_opportunity(opp)),
        )
    )
    db.commit()
    db.refresh(opp)
    log.info(
        "recovery decision recorded",
        extra={
            "event": event_type,
            "opportunity_id": str(opp.id),
            "merchant": merchant_email or "system",
            "decision": action,
            "outcome": opp.outcome.value if opp.outcome else None,
        },
    )
    return opp


def execute_opportunity(db: Session, opp: RecoveryOpportunity, force_outcome: str | None = None) -> RecoveryOpportunity:
    existing_attempt = db.query(RecoveryAttempt).filter(RecoveryAttempt.opportunity_id == opp.id).first()
    if existing_attempt and opp.action_status in (ActionStatus.completed, ActionStatus.failed):
        return opp

    if opp.policy_status == PolicyStatus.blocked or opp.action_status == ActionStatus.rejected:
        opp.action_status = ActionStatus.failed
        opp.outcome = OpportunityOutcome.not_recovered
    else:
        opp.action_status = ActionStatus.executing
        if force_outcome == "success":
            recovered, failure_reason = True, None
        elif force_outcome == "failure":
            recovered, failure_reason = False, "forced_failure"
        else:
            recovered, failure_reason = _seeded_outcome(opp, _truth_for_opportunity(db, opp))
        now = datetime.utcnow()
        if opp.payment_id:
            attempt = RecoveryAttempt(
                opportunity_id=opp.id,
                payment_id=opp.payment_id,
                method=RecoveryMethod.auto_retry if opp.recommended_intervention == InterventionType.payment_retry else RecoveryMethod.email,
                intervention=opp.recommended_intervention,
                status=RecoveryStatus.succeeded if recovered else RecoveryStatus.failed,
                recovered_amount=opp.amount_at_risk if recovered else None,
                failure_reason=failure_reason,
                created_at=now,
                resolved_at=now,
            )
            db.add(attempt)
        elif opp.checkout_session_id:
            attempt = RecoveryAttempt(
                opportunity_id=opp.id,
                checkout_session_id=opp.checkout_session_id,
                method=RecoveryMethod.email,
                intervention=opp.recommended_intervention,
                status=RecoveryStatus.succeeded if recovered else RecoveryStatus.failed,
                recovered_amount=opp.amount_at_risk if recovered else None,
                failure_reason=failure_reason,
                created_at=now,
                resolved_at=now,
            )
            db.add(attempt)
        elif opp.subscription_id:
            attempt = RecoveryAttempt(
                opportunity_id=opp.id,
                subscription_id=opp.subscription_id,
                method=RecoveryMethod.email,
                intervention=opp.recommended_intervention,
                status=RecoveryStatus.succeeded if recovered else RecoveryStatus.failed,
                recovered_amount=opp.amount_at_risk if recovered else None,
                failure_reason=failure_reason,
                created_at=now,
                resolved_at=now,
            )
            db.add(attempt)
        opp.action_status = ActionStatus.completed if recovered else ActionStatus.failed
        opp.outcome = OpportunityOutcome.recovered if recovered else OpportunityOutcome.not_recovered
        opp.executed_at = now
    opp.updated_at = datetime.utcnow()
    record_event(
        db,
        "recovery.action_completed" if opp.outcome == OpportunityOutcome.recovered else "recovery.action_failed",
        "recovery_opportunity",
        opp.id,
        serialize_opportunity(opp),
        f"execute:{opp.id}",
    )
    db.commit()
    db.refresh(opp)
    return opp
