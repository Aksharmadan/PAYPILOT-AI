"""Experiment assignment and results — control vs treatment recovery lift."""

from __future__ import annotations

import hashlib
import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.experiment import Experiment, ExperimentAssignment, ExperimentGroup, ExperimentStatus
from app.models.revenue import (
    ActionStatus,
    GroundTruthScenario,
    InterventionType,
    OpportunityOutcome,
    OpportunitySource,
    PolicyStatus,
    RecoveryAttempt,
    RecoveryMethod,
    RecoveryOpportunity,
    RecoveryStatus,
)
from app.services.opportunity_engine import (
    execute_opportunity,
    record_event,
    refresh_opportunities,
)


def _truth_for_opportunity(db: Session, opp: RecoveryOpportunity) -> GroundTruthScenario | None:
    if opp.payment_id:
        return db.query(GroundTruthScenario).filter(GroundTruthScenario.payment_id == opp.payment_id).first()
    if opp.checkout_session_id:
        return db.query(GroundTruthScenario).filter(GroundTruthScenario.checkout_session_id == opp.checkout_session_id).first()
    if opp.subscription_id:
        return db.query(GroundTruthScenario).filter(GroundTruthScenario.subscription_id == opp.subscription_id).first()
    return None


POPULATION_TO_SOURCE = {
    "failed_payments": OpportunitySource.payment,
    "abandoned_checkouts": OpportunitySource.checkout,
    "past_due_subscriptions": OpportunitySource.subscription,
}


def _assign_group(experiment_id, entity_id, split_ratio: float) -> ExperimentGroup:
    digest = hashlib.sha256(f"{experiment_id}:{entity_id}".encode()).hexdigest()
    draw = int(digest[:8], 16) / 0xFFFFFFFF
    return ExperimentGroup.treatment if draw < split_ratio else ExperimentGroup.control


def _entity_for(opp: RecoveryOpportunity) -> tuple:
    if opp.payment_id:
        return opp.payment_id, "payment"
    if opp.checkout_session_id:
        return opp.checkout_session_id, "checkout"
    if opp.subscription_id:
        return opp.subscription_id, "subscription"
    return opp.id, "opportunity"


def create_experiment(db: Session, name: str, population_filter: str, split_ratio: float) -> Experiment:
    if population_filter not in (*POPULATION_TO_SOURCE.keys(), "all"):
        raise ValueError(f"unsupported population_filter: {population_filter}")
    if not 0.05 <= split_ratio <= 0.95:
        raise ValueError("split_ratio must be between 0.05 and 0.95")
    exp = Experiment(
        id=uuid.uuid4(),
        name=name.strip() or "Untitled experiment",
        population_filter=population_filter,
        split_ratio=split_ratio,
        status=ExperimentStatus.draft,
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return exp


def _eligible_opportunities(db: Session, population_filter: str, limit: int = 400) -> list[RecoveryOpportunity]:
    refresh_opportunities(db, limit=limit)
    assigned_entities = {
        row[0]
        for row in db.query(ExperimentAssignment.entity_id).all()
    }
    query = (
        db.query(RecoveryOpportunity)
        .filter(RecoveryOpportunity.outcome == OpportunityOutcome.pending)
        .filter(RecoveryOpportunity.action_status.in_([ActionStatus.open, ActionStatus.approved]))
    )
    source = POPULATION_TO_SOURCE.get(population_filter)
    if source:
        query = query.filter(RecoveryOpportunity.source == source)
    rows = query.order_by(RecoveryOpportunity.expected_recovery_value.desc()).limit(limit * 2).all()

    eligible = []
    for opp in rows:
        entity_id, _ = _entity_for(opp)
        if entity_id in assigned_entities:
            continue
        # Experiment cohorts may include production-blocked rows (e.g. contact caps)
        # so we can still measure lift on remaining seed inventory.
        if opp.policy_status == PolicyStatus.blocked:
            opp.policy_status = PolicyStatus.approval_required
            opp.action_status = ActionStatus.open
        eligible.append(opp)
        if len(eligible) >= limit:
            break
    return eligible


def _resolve_control(db: Session, opp: RecoveryOpportunity) -> RecoveryOpportunity:
    """Control arm: no recovery intervention — depressed natural baseline."""
    truth = _truth_for_opportunity(db, opp)
    if truth:
        # Assumption: without intervention, natural recovery ≈ half the scenario rate.
        digest = hashlib.sha256(f"control:{opp.id}:{truth.id}".encode()).hexdigest()
        draw = int(digest[:8], 16) / 0xFFFFFFFF
        natural_p = max(min(truth.outcome_probability * 0.5, 0.45), 0.02)
        recovered = bool(truth.recoverable) and draw < natural_p
        failure_reason = None if recovered else "control_no_intervention"
    else:
        digest = hashlib.sha256(f"control:{opp.id}".encode()).hexdigest()
        draw = int(digest[:8], 16) / 0xFFFFFFFF
        recovered = draw < 0.18
        failure_reason = None if recovered else "control_no_intervention"
    now = datetime.utcnow()
    attempt = RecoveryAttempt(
        opportunity_id=opp.id,
        payment_id=opp.payment_id,
        checkout_session_id=opp.checkout_session_id,
        subscription_id=opp.subscription_id,
        method=RecoveryMethod.manual,
        intervention=InterventionType.no_action,
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
    opp.updated_at = now
    record_event(
        db,
        "experiment.control_resolved",
        "recovery_opportunity",
        opp.id,
        {"recovered": recovered},
        f"experiment_control:{opp.id}",
    )
    return opp


def start_experiment(db: Session, experiment: Experiment, limit: int = 400) -> Experiment:
    if experiment.status != ExperimentStatus.draft:
        raise ValueError("only draft experiments can be started")

    opportunities = _eligible_opportunities(db, experiment.population_filter, limit=limit)
    if not opportunities:
        raise ValueError("no eligible opportunities for this population")

    assigned = 0
    for opp in opportunities:
        entity_id, entity_type = _entity_for(opp)
        existing = (
            db.query(ExperimentAssignment)
            .filter(ExperimentAssignment.experiment_id == experiment.id)
            .filter(ExperimentAssignment.entity_id == entity_id)
            .first()
        )
        if existing:
            continue

        group = _assign_group(experiment.id, entity_id, experiment.split_ratio)
        assignment = ExperimentAssignment(
            id=uuid.uuid4(),
            experiment_id=experiment.id,
            opportunity_id=opp.id,
            entity_id=entity_id,
            entity_type=entity_type,
            group=group,
        )
        db.add(assignment)

        if group == ExperimentGroup.treatment:
            if opp.policy_status in (PolicyStatus.approval_required, PolicyStatus.escalated):
                opp.action_status = ActionStatus.approved
            if opp.policy_status != PolicyStatus.blocked:
                execute_opportunity(db, opp)
        else:
            _resolve_control(db, opp)
        assigned += 1

    experiment.status = ExperimentStatus.running
    experiment.started_at = datetime.utcnow()
    if assigned == 0:
        raise ValueError("all eligible entities were already assigned")
    db.commit()
    db.refresh(experiment)
    record_event(
        db,
        "experiment.started",
        "experiment",
        experiment.id,
        {"assigned": assigned, "population": experiment.population_filter},
        f"experiment_started:{experiment.id}",
    )
    db.commit()
    return experiment


def complete_experiment(db: Session, experiment: Experiment) -> Experiment:
    experiment.status = ExperimentStatus.completed
    experiment.ended_at = datetime.utcnow()
    db.commit()
    db.refresh(experiment)
    return experiment


def compute_results(db: Session, experiment: Experiment) -> dict:
    assignments = (
        db.query(ExperimentAssignment)
        .filter(ExperimentAssignment.experiment_id == experiment.id)
        .all()
    )

    def arm_stats(group: ExperimentGroup) -> dict:
        rows = [a for a in assignments if a.group == group]
        recovered = 0
        recovered_amount = 0.0
        amount_at_risk = 0.0
        for a in rows:
            opp = db.query(RecoveryOpportunity).filter(RecoveryOpportunity.id == a.opportunity_id).first()
            attempt = (
                db.query(RecoveryAttempt)
                .filter(RecoveryAttempt.opportunity_id == a.opportunity_id)
                .first()
            )
            if opp:
                amount_at_risk += opp.amount_at_risk or 0.0
            if attempt and attempt.status == RecoveryStatus.succeeded:
                recovered += 1
                recovered_amount += attempt.recovered_amount or 0.0
            elif opp and opp.outcome == OpportunityOutcome.recovered:
                recovered += 1
                recovered_amount += opp.amount_at_risk or 0.0
        n = len(rows)
        rate = (recovered / n) if n else 0.0
        return {
            "n": n,
            "recovered": recovered,
            "recovery_rate": round(rate, 4),
            "recovered_amount": round(recovered_amount, 2),
            "amount_at_risk": round(amount_at_risk, 2),
        }

    control = arm_stats(ExperimentGroup.control)
    treatment = arm_stats(ExperimentGroup.treatment)
    lift_pp = round((treatment["recovery_rate"] - control["recovery_rate"]) * 100, 2)
    # Incremental ₹: treatment recovered minus what treatment would have recovered at control rate
    expected_at_control = treatment["amount_at_risk"] * control["recovery_rate"]
    incremental = round(treatment["recovered_amount"] - expected_at_control, 2)

    return {
        "experiment_id": experiment.id,
        "name": experiment.name,
        "status": experiment.status.value,
        "population_filter": experiment.population_filter,
        "split_ratio": experiment.split_ratio,
        "started_at": experiment.started_at,
        "ended_at": experiment.ended_at,
        "control": control,
        "treatment": treatment,
        "lift_pp": lift_pp,
        "incremental_recovered": incremental,
    }


def serialize_experiment(exp: Experiment) -> dict:
    return {
        "id": exp.id,
        "name": exp.name,
        "population_filter": exp.population_filter,
        "split_ratio": exp.split_ratio,
        "status": exp.status.value,
        "started_at": exp.started_at,
        "ended_at": exp.ended_at,
        "created_at": exp.created_at,
    }
