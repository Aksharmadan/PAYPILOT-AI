"""
Demo Mode — controlled simulation for internship demonstrations.

POST /demo/trigger-payment-failure
  Creates a realistic payment failure for a randomly chosen customer, then
  runs the full PayPilot pipeline (risk scoring → policy evaluation →
  opportunity creation → audit event) and returns the created opportunity.

This endpoint is clearly labeled as a simulation environment.
It never calls a real payment gateway. All outcomes are deterministic.
"""
import random
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_merchant
from app.core.database import get_db
from app.core.logging import get_logger
from app.models.merchant import Merchant
from app.models.revenue import (
    Customer,
    FailureReason,
    OpportunityOutcome,
    Payment,
    PaymentStatus,
    RecoveryOpportunity,
    RevenueEvent,
)
from app.services.opportunity_engine import (
    evaluate_policy,
    record_event,
    serialize_opportunity,
)
from app.services.risk_scoring import score_payment_opportunity

log = get_logger("paypilot.demo")

router = APIRouter(prefix="/demo", tags=["demo"])

# Realistic failure scenarios suitable for live demonstrations
DEMO_SCENARIOS = [
    {
        "label": "High-Value Bank Timeout",
        "amount": 25000.0,
        "payment_method": "upi",
        "failure_reason": FailureReason.bank_timeout,
        "expected_policy": "auto",
        "description": "₹25,000 UPI payment failed due to bank timeout — high recovery probability.",
    },
    {
        "label": "Insufficient Funds — Enterprise",
        "amount": 45000.0,
        "payment_method": "card",
        "failure_reason": FailureReason.insufficient_funds,
        "expected_policy": "escalated",
        "description": "₹45,000 card payment declined — enterprise customer, requires approval.",
    },
    {
        "label": "Card Declined — Growth Plan",
        "amount": 9999.0,
        "payment_method": "card",
        "failure_reason": FailureReason.card_declined,
        "expected_policy": "approval_required",
        "description": "₹9,999 card declined — medium confidence, approval required.",
    },
    {
        "label": "Processing Error — Netbanking",
        "amount": 4999.0,
        "payment_method": "netbanking",
        "failure_reason": FailureReason.processing_error,
        "expected_policy": "auto",
        "description": "₹4,999 netbanking processing error — auto-retry eligible.",
    },
]


class DemoTriggerIn(BaseModel):
    scenario_index: int = 0  # 0–3, maps to DEMO_SCENARIOS
    customer_id: str | None = None  # optional: use specific customer, else random


class DemoTriggerOut(BaseModel):
    simulation_mode: bool = True
    scenario_label: str
    scenario_description: str
    customer_id: str
    customer_name: str
    payment_id: str
    opportunity_id: str
    amount: float
    failure_reason: str
    payment_method: str
    recovery_probability: float
    expected_recovery: float
    policy_status: str
    recommended_intervention: str
    confidence: str
    priority: str
    reason_codes: list[str]
    policy_checks: list[dict]
    pipeline_steps: list[dict]


@router.get("/scenarios")
def list_scenarios(_: Merchant = Depends(get_current_merchant)):
    """List all available demo scenarios."""
    return [
        {"index": i, "label": s["label"], "description": s["description"], "expected_policy": s["expected_policy"]}
        for i, s in enumerate(DEMO_SCENARIOS)
    ]


@router.post("/trigger-payment-failure", response_model=DemoTriggerOut)
def trigger_payment_failure(
    payload: DemoTriggerIn,
    db: Session = Depends(get_db),
    merchant: Merchant = Depends(get_current_merchant),
):
    """
    Simulate a payment failure and run the full PayPilot recovery pipeline.

    ⚠️  SIMULATION ENVIRONMENT — no real payments are processed.
    Outcomes are deterministic and clearly labeled.
    """
    if payload.scenario_index < 0 or payload.scenario_index >= len(DEMO_SCENARIOS):
        raise HTTPException(status_code=400, detail=f"scenario_index must be 0–{len(DEMO_SCENARIOS) - 1}")

    scenario = DEMO_SCENARIOS[payload.scenario_index]

    # ── Step 1: Select customer ────────────────────────────────────────────
    pipeline_steps = []
    pipeline_steps.append({"step": 1, "name": "Event received", "status": "completed", "detail": f"payment.failed event — {scenario['label']}"})

    if payload.customer_id:
        try:
            cid = uuid.UUID(payload.customer_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid customer_id format")
        customer = db.query(Customer).filter(Customer.id == cid).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
    else:
        # Pick a customer with good history for the demo — high LTV, low churn
        customer = (
            db.query(Customer)
            .filter(Customer.lifetime_value >= 10000)
            .filter(Customer.churn_risk_score <= 0.3)
            .order_by(Customer.lifetime_value.desc())
            .offset(random.randint(0, 20))
            .first()
        )
        if not customer:
            customer = db.query(Customer).order_by(Customer.lifetime_value.desc()).first()
        if not customer:
            raise HTTPException(status_code=503, detail="No customers in database. Run seed_data.py first.")

    pipeline_steps.append({"step": 2, "name": "Customer identified", "status": "completed", "detail": f"{customer.name} (LTV: ₹{customer.lifetime_value:,.0f})"})

    # ── Step 2: Create the simulated failed payment ────────────────────────
    payment = Payment(
        id=uuid.uuid4(),
        customer_id=customer.id,
        subscription_id=None,
        amount=scenario["amount"],
        currency="INR",
        status=PaymentStatus.failed,
        failure_reason=scenario["failure_reason"],
        payment_method=scenario["payment_method"],
        retry_count=0,
        created_at=datetime.utcnow(),
    )
    db.add(payment)
    db.flush()

    pipeline_steps.append({"step": 3, "name": "Recovery opportunity created", "status": "completed", "detail": f"payment_id: {payment.id}"})

    # ── Step 3: Score the opportunity ─────────────────────────────────────
    # Check if this customer has had a successful recovery before
    from app.models.revenue import RecoveryAttempt, RecoveryStatus
    prior_success = (
        db.query(RecoveryAttempt)
        .join(Payment, RecoveryAttempt.payment_id == Payment.id)
        .filter(Payment.customer_id == customer.id, RecoveryAttempt.status == RecoveryStatus.succeeded)
        .first()
    ) is not None

    score = score_payment_opportunity(payment, customer, prior_success)
    pipeline_steps.append({
        "step": 4,
        "name": "Risk scored",
        "status": "completed",
        "detail": f"Recovery probability: {score['recovery_probability']:.0%} | Confidence: {score['confidence']}",
    })

    # ── Step 4: Policy evaluation ─────────────────────────────────────────
    policy_status, checks = evaluate_policy(db, "payment", payment.amount, score, payment, customer.id)
    pipeline_steps.append({
        "step": 5,
        "name": "Policy evaluated",
        "status": "completed",
        "detail": f"Decision: {policy_status.value} | {sum(1 for c in checks if c['passed'])}/{len(checks)} checks passed",
    })

    # ── Step 5: Upsert opportunity ─────────────────────────────────────────
    import json
    now = datetime.utcnow()
    opp = RecoveryOpportunity(
        id=uuid.uuid4(),
        source="payment",
        customer_id=customer.id,
        payment_id=payment.id,
        amount_at_risk=payment.amount,
        recovery_probability=score["recovery_probability"],
        intervention_success_probability=score["intervention_success_probability"],
        expected_recovery_value=score["expected_recovery_value"],
        priority=score["priority"],
        confidence=score["confidence"],
        recommended_intervention=score["recommended_intervention"],
        reason_codes=json.dumps(score["reason_codes"]),
        supporting_evidence=json.dumps(score["supporting_evidence"], default=str),
        policy_status=policy_status,
        policy_version="policy_v1",
        policy_checks=json.dumps(checks),
        created_at=now,
        updated_at=now,
    )
    db.add(opp)
    db.flush()

    # ── Step 6: Record audit events ────────────────────────────────────────
    record_event(
        db,
        "payment.failed",
        "payment",
        payment.id,
        {
            "customer_id": str(customer.id),
            "amount": payment.amount,
            "failure_reason": scenario["failure_reason"].value,
            "payment_method": scenario["payment_method"],
            "simulation": True,
        },
        f"demo:payment.failed:{payment.id}",
        str(opp.id),
    )
    record_event(
        db,
        "recovery.opportunity_created",
        "recovery_opportunity",
        opp.id,
        {
            "payment_id": str(payment.id),
            "customer_id": str(customer.id),
            "policy_status": policy_status.value,
            "simulation": True,
        },
        f"demo:opportunity_created:{opp.id}",
        str(opp.id),
    )

    db.commit()

    pipeline_steps.append({"step": 6, "name": "Audit events recorded", "status": "completed", "detail": "payment.failed + recovery.opportunity_created"})
    pipeline_steps.append({"step": 7, "name": "Ready for action", "status": "ready", "detail": f"Opportunity {opp.id} is in the recovery queue"})

    log.info(
        "demo payment failure triggered",
        extra={
            "scenario": scenario["label"],
            "customer_id": str(customer.id),
            "payment_id": str(payment.id),
            "opportunity_id": str(opp.id),
            "policy_status": policy_status.value,
            "merchant": merchant.email,
        },
    )

    return DemoTriggerOut(
        simulation_mode=True,
        scenario_label=scenario["label"],
        scenario_description=scenario["description"],
        customer_id=str(customer.id),
        customer_name=customer.name,
        payment_id=str(payment.id),
        opportunity_id=str(opp.id),
        amount=payment.amount,
        failure_reason=scenario["failure_reason"].value,
        payment_method=scenario["payment_method"],
        recovery_probability=score["recovery_probability"],
        expected_recovery=score["expected_recovery_value"],
        policy_status=policy_status.value,
        recommended_intervention=score["recommended_intervention"],
        confidence=score["confidence"],
        priority=score["priority"],
        reason_codes=score["reason_codes"],
        policy_checks=checks,
        pipeline_steps=pipeline_steps,
    )
