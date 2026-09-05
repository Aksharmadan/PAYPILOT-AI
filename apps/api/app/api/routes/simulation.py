from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_merchant
from app.core.database import get_db
from app.models.merchant import Merchant
from app.models.revenue import Payment, PaymentStatus, CheckoutSession, CheckoutStatus, Customer, RecoveryAttempt
from app.services.risk_scoring import score_payment, score_checkout
from app.services.policy_engine import evaluate_policy_custom
from app.api.routes.risk import _customer_ids_with_prior_recovery_success
from app.schemas.revenue import SimulationIn, SimulationOut

router = APIRouter(prefix="/simulation", tags=["simulation"])


def _undecided_scored_items(db: Session):
    decided_payment_ids = {r[0] for r in db.query(RecoveryAttempt.payment_id).filter(RecoveryAttempt.payment_id.isnot(None)).all()}
    decided_checkout_ids = {r[0] for r in db.query(RecoveryAttempt.checkout_session_id).filter(RecoveryAttempt.checkout_session_id.isnot(None)).all()}
    customers_by_id = {c.id: c for c in db.query(Customer).all()}
    prior_success = _customer_ids_with_prior_recovery_success(db)

    items = []
    failed_q = db.query(Payment).filter(Payment.status == PaymentStatus.failed)
    if decided_payment_ids:
        failed_q = failed_q.filter(~Payment.id.in_(decided_payment_ids))
    for p in failed_q.all():
        customer = customers_by_id.get(p.customer_id)
        score = score_payment(p, customer, p.customer_id in prior_success)
        items.append({"amount": p.amount, "retry_count": p.retry_count,
                       "failure_reason": p.failure_reason.value if p.failure_reason else None, "score": score})

    abandoned_q = db.query(CheckoutSession).filter(CheckoutSession.status == CheckoutStatus.abandoned)
    if decided_checkout_ids:
        abandoned_q = abandoned_q.filter(~CheckoutSession.id.in_(decided_checkout_ids))
    for chk in abandoned_q.all():
        items.append({"amount": chk.amount, "retry_count": 0, "failure_reason": None, "score": score_checkout(chk)})

    return items


def _run_policy(items, **policy_kwargs):
    tiers = {"auto": 0, "approval": 0, "escalate": 0, "blocked": 0}
    expected_recovery = 0.0
    for it in items:
        eligible, _, tier = evaluate_policy_custom(
            amount=it["amount"], retry_count=it["retry_count"], failure_reason=it["failure_reason"],
            score=it["score"], last_attempt_at=None, **policy_kwargs,
        )
        tiers[tier if eligible else "blocked"] += 1
        if eligible:
            expected_recovery += it["amount"] * it["score"]
    return tiers, round(expected_recovery, 2)


@router.post("/what-if", response_model=SimulationOut)
def what_if(payload: SimulationIn, db: Session = Depends(get_db), _: Merchant = Depends(get_current_merchant)):
    items = _undecided_scored_items(db)
    baseline_tiers, baseline_recovery = _run_policy(items)
    simulated_tiers, simulated_recovery = _run_policy(
        items, max_retries=payload.max_retries, auto_max_amount=payload.auto_max_amount,
        min_confidence_for_auto=payload.min_confidence_for_auto,
        min_retry_interval_minutes=payload.min_retry_interval_minutes,
    )
    return SimulationOut(
        baseline_expected_recovery=baseline_recovery, simulated_expected_recovery=simulated_recovery,
        recovery_delta=round(simulated_recovery - baseline_recovery, 2),
        baseline_tiers=baseline_tiers, simulated_tiers=simulated_tiers,
    )
