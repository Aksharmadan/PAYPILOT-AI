from collections import Counter

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.revenue import DatasetSplit, GroundTruthScenario, RecoveryOpportunity
from app.services.opportunity_engine import refresh_opportunities

BUCKETS = [(0.0, 0.2), (0.2, 0.4), (0.4, 0.6), (0.6, 0.8), (0.8, 1.01)]


def _round(value, digits=4):
    return None if value is None else round(value, digits)


def _safe_div(numerator, denominator):
    return None if denominator == 0 else numerator / denominator


def _auc(points):
    positives = [p for p in points if p["actual"] == 1]
    negatives = [p for p in points if p["actual"] == 0]
    if not positives or not negatives:
        return None
    wins = 0.0
    for pos in positives:
        for neg in negatives:
            if pos["probability"] > neg["probability"]:
                wins += 1
            elif pos["probability"] == neg["probability"]:
                wins += 0.5
    return wins / (len(positives) * len(negatives))


def _opportunity_query(db: Session, split: DatasetSplit | None = DatasetSplit.heldout):
    if db.query(RecoveryOpportunity).count() == 0:
        refresh_opportunities(db)
    query = (
        db.query(RecoveryOpportunity, GroundTruthScenario)
        .join(
            GroundTruthScenario,
            or_(
                RecoveryOpportunity.payment_id == GroundTruthScenario.payment_id,
                RecoveryOpportunity.checkout_session_id == GroundTruthScenario.checkout_session_id,
                RecoveryOpportunity.subscription_id == GroundTruthScenario.subscription_id,
            ),
        )
    )
    if split:
        query = query.filter(GroundTruthScenario.dataset_split == split)
    return query.all()


def evaluation_points(db: Session, split: DatasetSplit | None = DatasetSplit.heldout):
    rows = _opportunity_query(db, split)
    return [
        {
            "opportunity": opp,
            "truth": truth,
            "actual": 1 if truth.recoverable else 0,
            "predicted": 1 if opp.recovery_probability >= 0.5 and opp.recommended_intervention.value != "no_action" else 0,
            "probability": opp.recovery_probability,
            "expected_recovery": opp.expected_recovery_value,
            "actual_recovery": truth.recovery_amount if truth.recoverable else 0.0,
        }
        for opp, truth in rows
    ]


def model_metrics(db: Session, split: DatasetSplit | None = DatasetSplit.heldout, points: list | None = None):
    if points is None:
        points = evaluation_points(db, split)
    if len(points) < 20:
        return {"insufficient_data": True, "sample_size": len(points)}

    tp = sum(1 for p in points if p["predicted"] == 1 and p["actual"] == 1)
    fp = sum(1 for p in points if p["predicted"] == 1 and p["actual"] == 0)
    tn = sum(1 for p in points if p["predicted"] == 0 and p["actual"] == 0)
    fn = sum(1 for p in points if p["predicted"] == 0 and p["actual"] == 1)

    precision = _safe_div(tp, tp + fp)
    recall = _safe_div(tp, tp + fn)
    f1 = None if not precision or not recall else 2 * precision * recall / (precision + recall)
    brier = sum((p["probability"] - p["actual"]) ** 2 for p in points) / len(points)

    return {
        "insufficient_data": False,
        "sample_size": len(points),
        "precision": _round(precision),
        "recall": _round(recall),
        "f1": _round(f1),
        "roc_auc": _round(_auc(points)),
        "brier_score": _round(brier),
        "confusion_matrix": {"tp": tp, "fp": fp, "tn": tn, "fn": fn},
    }


def calibration(db: Session, split: DatasetSplit | None = DatasetSplit.heldout, points: list | None = None):
    if points is None:
        points = evaluation_points(db, split)
    rows = []
    for low, high in BUCKETS:
        bucket = [p for p in points if low <= p["probability"] < high]
        predicted = None if not bucket else sum(p["probability"] for p in bucket) / len(bucket)
        actual = None if not bucket else sum(p["actual"] for p in bucket) / len(bucket)
        rows.append({
            "bucket": f"{int(low * 100)}-{int((high if high <= 1 else 1) * 100)}%",
            "predicted_probability": _round(predicted),
            "actual_recovery_rate": _round(actual),
            "sample_size": len(bucket),
        })
    return {"sample_size": len(points), "buckets": rows}


def recovery_economics(db: Session, split: DatasetSplit | None = DatasetSplit.heldout, points: list | None = None):
    if points is None:
        points = evaluation_points(db, split)
    if not points:
        return {"insufficient_data": True, "sample_size": 0}
    total_at_risk = sum(p["opportunity"].amount_at_risk for p in points)
    predicted_recoverable = sum(p["opportunity"].amount_at_risk for p in points if p["predicted"])
    expected_recovery = sum(p["expected_recovery"] for p in points)
    actual_recovered = sum(p["actual_recovery"] for p in points)
    return {
        "insufficient_data": False,
        "sample_size": len(points),
        "total_revenue_at_risk": round(total_at_risk, 2),
        "predicted_recoverable_revenue": round(predicted_recoverable, 2),
        "expected_recovery": round(expected_recovery, 2),
        "actual_recovered_revenue": round(actual_recovered, 2),
        "expected_vs_actual_recovery": round(expected_recovery - actual_recovered, 2),
        "recovery_rate": _round(_safe_div(actual_recovered, total_at_risk)),
    }


def intervention_metrics(db: Session, split: DatasetSplit | None = DatasetSplit.heldout, points: list | None = None):
    if points is None:
        points = evaluation_points(db, split)
    if not points:
        return {"insufficient_data": True, "sample_size": 0}
    correct = unnecessary = missed = false_positive_cost = 0
    for point in points:
        opp = point["opportunity"]
        truth = point["truth"]
        expected_intervention = getattr(truth.expected_intervention, "value", truth.expected_intervention)
        recommended = opp.recommended_intervention.value
        if expected_intervention == recommended:
            correct += 1
        if point["predicted"] and not point["actual"]:
            unnecessary += 1
            false_positive_cost += max(25.0, opp.amount_at_risk * 0.01)
        if not point["predicted"] and point["actual"]:
            missed += 1
    return {
        "insufficient_data": False,
        "sample_size": len(points),
        "correct_intervention": correct,
        "unnecessary_intervention": unnecessary,
        "missed_opportunity": missed,
        "false_positive_cost": round(false_positive_cost, 2),
        "white_space_indicator": 0,  # maintain schema
        "intervention_accuracy": _round(_safe_div(correct, len(points))),
    }


def ground_truth_distribution(db: Session):
    rows = (
        db.query(
            GroundTruthScenario.dataset_split,
            GroundTruthScenario.scenario_type,
            func.count(GroundTruthScenario.id),
        )
        .group_by(GroundTruthScenario.dataset_split, GroundTruthScenario.scenario_type)
        .all()
    )
    by_split = {}
    for split, scenario_type, count in rows:
        by_split.setdefault(split.value, {})[scenario_type] = count
    return by_split


def evaluation_summary(db: Session):
    heldout_points = evaluation_points(db, DatasetSplit.heldout)
    all_points = evaluation_points(db, None)
    
    model = model_metrics(db, DatasetSplit.heldout, heldout_points)
    return {
        "model": model,
        "calibration": calibration(db, DatasetSplit.heldout, heldout_points),
        "recovery": recovery_economics(db, DatasetSplit.heldout, heldout_points),
        "interventions": intervention_metrics(db, DatasetSplit.heldout, heldout_points),
        "ground_truth_distribution": ground_truth_distribution(db),
        "confidence_distribution": confidence_distribution(db, all_points),
    }


def confidence_distribution(db: Session, points: list | None = None):
    if points is None:
        points = evaluation_points(db, None)
    counts = Counter(point["opportunity"].confidence.value for point in points)
    amounts = Counter()
    for point in points:
        amounts[point["opportunity"].confidence.value] += point["opportunity"].amount_at_risk
    return {
        "counts": dict(counts),
        "amounts": {key: round(value, 2) for key, value in amounts.items()},
    }
