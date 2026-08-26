"""
Heuristic recoverability scoring - Phase 4.
Not a trained model. A transparent, explainable scoring function using real
signals present in the data: payment method, retries already attempted,
how recently the failure happened, the customer's churn risk, the failure
reason itself, and whether this customer has been successfully recovered
before. No score is hardcoded or nudged to cross any threshold — items only
land "high confidence" when the underlying signals genuinely support it.
"""
from datetime import datetime, timezone

METHOD_RECOVERABILITY = {
    "card": 0.85,
    "netbanking": 0.65,
    "upi": 0.75,
    "wallet": 0.60,
}

# Some failure reasons are inherently more recoverable than others — a
# timeout or a temporary decline is often just a retry away; a fraud hold
# or an expired card usually is not.
FAILURE_REASON_RECOVERABILITY = {
    "bank_timeout": 0.90,
    "insufficient_funds": 0.75,
    "card_declined": 0.70,
    "processing_error": 0.65,
    "expired_card": 0.35,
    "fraud_suspected": 0.10,
}


def _days_since(ts: datetime) -> int:
    now = datetime.now(timezone.utc)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return max((now - ts).days, 0)


def _reason_key(failure_reason) -> str:
    return getattr(failure_reason, "value", failure_reason) or ""


def score_payment(payment, customer=None, prior_recovery_success: bool = False) -> float:
    base = METHOD_RECOVERABILITY.get((payment.payment_method or "").lower(), 0.55)
    reason_factor = FAILURE_REASON_RECOVERABILITY.get(_reason_key(payment.failure_reason), 0.6)
    retry_penalty = min(payment.retry_count * 0.15, 0.6)
    days_since = _days_since(payment.created_at)
    age_decay = max(1 - days_since * 0.02, 0.3)
    churn_penalty = 1.0
    if customer is not None:
        churn_penalty = 1 - (customer.churn_risk_score * 0.4)
    # A modest boost, not a threshold hack: a customer who has been
    # successfully recovered before is a genuinely better bet.
    loyalty_boost = 1.05 if prior_recovery_success else 1.0

    score = base * reason_factor * (1 - retry_penalty) * age_decay * churn_penalty * loyalty_boost
    return round(max(min(score, 1.0), 0.0), 3)


def score_checkout(checkout) -> float:
    reference_ts = checkout.abandoned_at or checkout.started_at
    days_since = _days_since(reference_ts)
    age_decay = max(1 - days_since * 0.03, 0.25)
    return round(max(min(0.6 * age_decay, 1.0), 0.0), 3)


def classify(score: float) -> str:
    if score >= 0.7:
        return "high"
    if score >= 0.4:
        return "medium"
    return "low"


def priority_for(amount: float, expected_recovery: float) -> str:
    if expected_recovery >= 7500 or amount >= 20000:
        return "critical"
    if expected_recovery >= 2500 or amount >= 10000:
        return "high"
    if expected_recovery >= 750:
        return "medium"
    return "low"


def intervention_for_payment(payment, score: float) -> str:
    reason = _reason_key(payment.failure_reason)
    if reason == "fraud_suspected":
        return "escalation"
    if reason == "expired_card":
        return "payment_method_update"
    if payment.retry_count >= 3 or score < 0.2:
        return "no_action"
    if reason in {"bank_timeout", "processing_error"} and payment.retry_count <= 1:
        return "payment_retry"
    if reason == "insufficient_funds":
        return "delayed_retry"
    return "payment_method_update"


def score_payment_opportunity(payment, customer=None, prior_recovery_success: bool = False) -> dict:
    recovery_probability = score_payment(payment, customer, prior_recovery_success)
    intervention = intervention_for_payment(payment, recovery_probability)
    intervention_success = {
        "payment_retry": 0.88,
        "delayed_retry": 0.72,
        "payment_method_update": 0.64,
        "escalation": 0.45,
        "no_action": 0.0,
    }.get(intervention, 0.5)
    expected_recovery = round(payment.amount * recovery_probability * intervention_success, 2)
    reason = _reason_key(payment.failure_reason)
    reason_codes = [
        f"failure_reason:{reason or 'unknown'}",
        f"payment_method:{payment.payment_method or 'unknown'}",
        f"retry_count:{payment.retry_count}",
    ]
    if prior_recovery_success:
        reason_codes.append("customer:prior_recovery_success")
    if customer is not None:
        reason_codes.append(f"churn_risk:{classify(customer.churn_risk_score)}")
    return {
        "recovery_probability": recovery_probability,
        "intervention_success_probability": intervention_success,
        "expected_recovery_value": expected_recovery,
        "priority": priority_for(payment.amount, expected_recovery),
        "confidence": classify(recovery_probability),
        "recommended_intervention": intervention,
        "reason_codes": reason_codes,
        "supporting_evidence": {
            "amount": payment.amount,
            "failure_reason": reason,
            "payment_method": payment.payment_method,
            "retry_count": payment.retry_count,
            "customer_lifetime_value": getattr(customer, "lifetime_value", None),
            "customer_churn_risk_score": getattr(customer, "churn_risk_score", None),
            "prior_recovery_success": prior_recovery_success,
            "days_since_event": _days_since(payment.created_at),
        },
    }


def score_checkout_opportunity(checkout, customer=None) -> dict:
    recovery_probability = score_checkout(checkout)
    intervention = "checkout_recovery_message" if recovery_probability >= 0.25 else "no_action"
    intervention_success = 0.42 if intervention != "no_action" else 0.0
    expected_recovery = round(checkout.amount * recovery_probability * intervention_success, 2)
    return {
        "recovery_probability": recovery_probability,
        "intervention_success_probability": intervention_success,
        "expected_recovery_value": expected_recovery,
        "priority": priority_for(checkout.amount, expected_recovery),
        "confidence": classify(recovery_probability),
        "recommended_intervention": intervention,
        "reason_codes": [
            "source:checkout_abandonment",
            "intent:started_checkout",
            f"customer:{'known' if customer else 'guest'}",
        ],
        "supporting_evidence": {
            "amount": checkout.amount,
            "customer_lifetime_value": getattr(customer, "lifetime_value", None),
            "days_since_event": _days_since(checkout.abandoned_at or checkout.started_at),
        },
    }


def score_subscription_opportunity(
    subscription,
    customer=None,
    failed_payment_count: int = 0,
    prior_successful_renewals: int = 0,
) -> dict:
    """Subscription-specific recovery heuristic — not the payment formula.

    Signals: days past due, MRR value, prior successful renewals, failed
    renewal attempts, and customer churn/LTV. Kept separate so payment
    scoring changes cannot silently distort subscription decisions.
    """
    days_past_due = max(_days_since(subscription.current_period_end), 0)

    # Fresh past-due accounts are more recoverable; deep delinquency decays hard.
    recency = max(1.0 - (days_past_due * 0.04), 0.25)
    mrr_factor = 1.08 if subscription.mrr >= 5000 else (1.03 if subscription.mrr >= 1500 else 1.0)
    renewal_history = min(1.0 + prior_successful_renewals * 0.04, 1.2)
    failure_drag = max(1.0 - min(failed_payment_count, 6) * 0.09, 0.4)

    churn_factor = 1.0
    ltv_factor = 1.0
    if customer is not None:
        churn_factor = 1.0 - (customer.churn_risk_score * 0.4)
        if customer.lifetime_value >= 25000:
            ltv_factor = 1.07

    recovery_probability = round(
        max(min(0.78 * recency * mrr_factor * renewal_history * failure_drag * churn_factor * ltv_factor, 1.0), 0.0),
        3,
    )
    if days_past_due >= 45 or recovery_probability < 0.25:
        intervention = "escalation"
        intervention_success = 0.38
    else:
        intervention = "subscription_recovery"
        intervention_success = 0.7

    expected_recovery = round(subscription.mrr * recovery_probability * intervention_success, 2)
    return {
        "recovery_probability": recovery_probability,
        "intervention_success_probability": intervention_success,
        "expected_recovery_value": expected_recovery,
        "priority": priority_for(subscription.mrr, expected_recovery),
        "confidence": classify(recovery_probability),
        "recommended_intervention": intervention,
        "reason_codes": [
            "source:past_due_subscription",
            f"days_past_due:{days_past_due}",
            f"prior_renewals:{prior_successful_renewals}",
            f"failed_renewals:{failed_payment_count}",
            f"plan:{subscription.plan_name}",
        ],
        "supporting_evidence": {
            "mrr": subscription.mrr,
            "plan_name": subscription.plan_name,
            "days_past_due": days_past_due,
            "prior_successful_renewals": prior_successful_renewals,
            "failed_payment_count": failed_payment_count,
            "customer_lifetime_value": getattr(customer, "lifetime_value", None),
            "customer_churn_risk_score": getattr(customer, "churn_risk_score", None),
        },
    }
