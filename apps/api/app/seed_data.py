"""
PayPilot — Phase 2 Synthetic Data Generator
"""

import argparse
import random
import uuid
from datetime import datetime, timedelta

from faker import Faker

from app.core.database import Base, engine, SessionLocal
from app.models.revenue import (
    Customer, Subscription, Payment, CheckoutSession, RecoveryAttempt,
    SubscriptionStatus, PaymentStatus, FailureReason, CheckoutStatus,
    RecoveryMethod, RecoveryStatus,
    DatasetSplit, GroundTruthScenario, PolicyStatus, InterventionType,
    RecoveryOpportunity, RevenueEvent,
)

fake = Faker("en_IN")
Faker.seed(42)
random.seed(42)

NOW = datetime.utcnow()
HISTORY_DAYS = 180

PLANS = [
    ("Starter", 999),
    ("Growth", 2499),
    ("Scale", 4999),
    ("Enterprise", 9999),
]

PAYMENT_METHODS = ["card", "upi", "netbanking", "wallet"]
PAYMENT_METHOD_WEIGHTS = [0.35, 0.45, 0.12, 0.08]

COUNTRIES = ["India"] * 85 + ["UAE", "Singapore", "USA", "UK"] * 4

FAILURE_REASON_WEIGHTS = {
    FailureReason.card_declined: 0.35,
    FailureReason.insufficient_funds: 0.25,
    FailureReason.bank_timeout: 0.15,
    FailureReason.expired_card: 0.12,
    FailureReason.processing_error: 0.08,
    FailureReason.fraud_suspected: 0.05,
}

# Ground truth: most failures are historical, but a realistic minority are
# genuinely untouched — no retry attempted yet. This is what makes a failure
# a "fresh opportunity" rather than an already-worked one.
RETRY_COUNT_WEIGHTS = {0: 0.45, 1: 0.30, 2: 0.15, 3: 0.10}


def random_datetime_within(days_back):
    delta_seconds = random.randint(0, days_back * 24 * 3600)
    return NOW - timedelta(seconds=delta_seconds)


def recent_biased_datetime(days_back, recent_window=5, recent_weight=0.3):
    """A realistic minority of failures should be very recent — actionable,
    not-yet-worked cases a recovery system would be triaging right now."""
    if random.random() < recent_weight:
        return random_datetime_within(recent_window)
    return random_datetime_within(days_back)


def weighted_choice(weight_map):
    items = list(weight_map.keys())
    weights = list(weight_map.values())
    return random.choices(items, weights=weights, k=1)[0]


def make_customers(n):
    customers = []
    for _ in range(n):
        created = random_datetime_within(HISTORY_DAYS)
        customers.append({
            "id": uuid.uuid4(),
            "name": fake.name(),
            "email": fake.unique.email(),
            "country": random.choice(COUNTRIES),
            "plan": None,
            "lifetime_value": 0.0,
            "churn_risk_score": round(random.betavariate(2, 6), 3),
            "created_at": created,
        })
    return customers


def make_subscription(customer_id, customer_created_at):
    plan_name, mrr = random.choice(PLANS)
    sub_created = customer_created_at + timedelta(days=random.randint(0, 5))
    if sub_created > NOW:
        sub_created = customer_created_at

    status = random.choices(
        [SubscriptionStatus.active, SubscriptionStatus.past_due,
         SubscriptionStatus.canceled, SubscriptionStatus.trialing],
        weights=[0.78, 0.12, 0.08, 0.02],
        k=1,
    )[0]

    canceled_at = None
    if status == SubscriptionStatus.canceled:
        canceled_at = sub_created + timedelta(days=random.randint(10, HISTORY_DAYS))
        if canceled_at > NOW:
            canceled_at = NOW

    period_end = (canceled_at or NOW) + timedelta(days=random.randint(1, 30))

    return {
        "id": uuid.uuid4(),
        "customer_id": customer_id,
        "plan_name": plan_name,
        "mrr": float(mrr),
        "status": status,
        "current_period_end": period_end,
        "created_at": sub_created,
        "canceled_at": canceled_at,
    }, mrr, plan_name


def make_subscription_payments(sub):
    payments = []
    cursor = sub["created_at"]
    end = sub["canceled_at"] or NOW

    while cursor < end:
        # Real-world clustering: card expiries and bank-detail issues concentrate
        # around the current billing cycle for some fraction of any live customer
        # base. This raises the failure probability for the most recent cycle only
        # -- no dates are moved, no scores are touched, just which cycles fail.
        is_recent_cycle = cursor >= end - timedelta(days=10)
        fail_prob = 0.22 if is_recent_cycle else 0.09
        is_failed = random.random() < fail_prob
        status = PaymentStatus.failed if is_failed else PaymentStatus.succeeded
        failure_reason = weighted_choice(FAILURE_REASON_WEIGHTS) if is_failed else None

        payments.append({
            "id": uuid.uuid4(),
            "customer_id": sub["customer_id"],
            "subscription_id": sub["id"],
            "amount": sub["mrr"],
            "currency": "INR",
            "status": status,
            "failure_reason": failure_reason,
            "payment_method": random.choices(PAYMENT_METHODS, weights=PAYMENT_METHOD_WEIGHTS, k=1)[0],
            "retry_count": weighted_choice(RETRY_COUNT_WEIGHTS) if is_failed else 0,
            "created_at": cursor,
        })
        cursor += timedelta(days=30)

    return payments


def make_oneoff_payments(customer_id, customer_created_at, count):
    payments = []
    for _ in range(count):
        is_failed = random.random() < 0.06

        if is_failed:
            created = recent_biased_datetime(HISTORY_DAYS, recent_window=5, recent_weight=0.3)
            if created < customer_created_at:
                created = customer_created_at
        else:
            created = customer_created_at + timedelta(
                days=random.randint(0, max((NOW - customer_created_at).days, 1))
            )

        status = PaymentStatus.failed if is_failed else PaymentStatus.succeeded
        if not is_failed and random.random() < 0.01:
            status = PaymentStatus.refunded

        payments.append({
            "id": uuid.uuid4(),
            "customer_id": customer_id,
            "subscription_id": None,
            "amount": round(random.uniform(199, 3499), 2),
            "currency": "INR",
            "status": status,
            "failure_reason": weighted_choice(FAILURE_REASON_WEIGHTS) if is_failed else None,
            "payment_method": random.choices(PAYMENT_METHODS, weights=PAYMENT_METHOD_WEIGHTS, k=1)[0],
            "retry_count": weighted_choice(RETRY_COUNT_WEIGHTS) if is_failed else 0,
            "created_at": created,
        })
    return payments


def make_checkout_sessions(customer_ids, guest_count):
    sessions = []

    for cid in customer_ids:
        for _ in range(random.choices([0, 1, 2, 3], weights=[0.3, 0.4, 0.2, 0.1])[0]):
            started = random_datetime_within(HISTORY_DAYS)
            abandoned = random.random() < 0.16
            sessions.append({
                "id": uuid.uuid4(),
                "customer_id": cid,
                "amount": round(random.uniform(299, 4999), 2),
                "currency": "INR",
                "status": CheckoutStatus.abandoned if abandoned else CheckoutStatus.completed,
                "started_at": started,
                "abandoned_at": started + timedelta(minutes=random.randint(2, 40)) if abandoned else None,
            })

    for _ in range(guest_count):
        started = random_datetime_within(HISTORY_DAYS)
        abandoned = random.random() < 0.24
        sessions.append({
            "id": uuid.uuid4(),
            "customer_id": None,
            "amount": round(random.uniform(299, 4999), 2),
            "currency": "INR",
            "status": CheckoutStatus.abandoned if abandoned else CheckoutStatus.completed,
            "started_at": started,
            "abandoned_at": started + timedelta(minutes=random.randint(2, 40)) if abandoned else None,
        })

    return sessions


SCENARIO_COUNTS = {
    "highly_recoverable_payment": 14,
    "low_recoverability_payment": 14,
    "checkout_high_intent": 14,
    "checkout_low_intent": 14,
    "subscription_recovery": 14,
    "subscription_non_recovery": 14,
    "human_approval_case": 10,
    "do_nothing_case": 10,
}


def scenario_split(index):
    return DatasetSplit.heldout if index % 4 == 0 else DatasetSplit.train


def make_scenario_customer(index, churn, ltv=0.0, days_back=120):
    created = NOW - timedelta(days=days_back)
    return {
        "id": uuid.uuid4(),
        "name": f"Scenario Customer {index:03d}",
        "email": f"scenario-{index:03d}@paypilot.test",
        "country": "India",
        "plan": "Growth",
        "lifetime_value": ltv,
        "churn_risk_score": churn,
        "created_at": created,
    }


def successful_history(customer_id, count, amount=2499, days_back=100):
    return [
        {
            "id": uuid.uuid4(),
            "customer_id": customer_id,
            "subscription_id": None,
            "amount": float(amount),
            "currency": "INR",
            "status": PaymentStatus.succeeded,
            "failure_reason": None,
            "payment_method": "upi",
            "retry_count": 0,
            "created_at": NOW - timedelta(days=days_back - i * 12),
        }
        for i in range(count)
    ]


def failed_history(customer_id, count, amount=999, reason=FailureReason.fraud_suspected):
    rows = []
    for i in range(count):
        rows.append({
            "id": uuid.uuid4(),
            "customer_id": customer_id,
            "subscription_id": None,
            "amount": float(amount),
            "currency": "INR",
            "status": PaymentStatus.failed,
            "failure_reason": reason,
            "payment_method": "card",
            "retry_count": 3,
            "created_at": NOW - timedelta(days=80 - i * 10),
        })
    return rows


def make_ground_truth_scenarios(start_index=0):
    customers, subs, payments, checkouts, attempts, labels = [], [], [], [], [], []
    target_payment_ids, target_checkout_ids = set(), set()
    idx = start_index

    def add_label(scenario_type, split, customer_id=None, payment_id=None, checkout_id=None,
                  subscription_id=None, recoverable=True, amount=0.0, outcome_probability=0.5,
                  expected_policy=None, expected_intervention=None, notes=None):
        labels.append({
            "id": uuid.uuid4(),
            "scenario_type": scenario_type,
            "dataset_split": split,
            "customer_id": customer_id,
            "payment_id": payment_id,
            "checkout_session_id": checkout_id,
            "subscription_id": subscription_id,
            "recoverable": 1 if recoverable else 0,
            "eventual_outcome": "recovered" if recoverable else "not_recovered",
            "recovery_amount": float(amount if recoverable else 0.0),
            "outcome_probability": outcome_probability,
            "expected_policy_status": expected_policy,
            "expected_intervention": expected_intervention,
            "notes": str(notes or {}),
            "created_at": NOW,
        })

    for scenario_type, count in SCENARIO_COUNTS.items():
        for i in range(count):
            idx += 1
            split = scenario_split(i)

            if scenario_type == "highly_recoverable_payment":
                cust = make_scenario_customer(idx, churn=0.08, ltv=18000)
                customers.append(cust)
                payments.extend(successful_history(cust["id"], 6, amount=2499))
                old_failed = {
                    "id": uuid.uuid4(), "customer_id": cust["id"], "subscription_id": None,
                    "amount": 1899.0, "currency": "INR", "status": PaymentStatus.failed,
                    "failure_reason": FailureReason.bank_timeout, "payment_method": "upi",
                    "retry_count": 0, "created_at": NOW - timedelta(days=45),
                }
                payments.append(old_failed)
                attempts.append({
                    "id": uuid.uuid4(), "payment_id": old_failed["id"], "checkout_session_id": None,
                    "method": RecoveryMethod.auto_retry, "status": RecoveryStatus.succeeded,
                    "recovered_amount": old_failed["amount"], "created_at": old_failed["created_at"] + timedelta(hours=3),
                    "resolved_at": old_failed["created_at"] + timedelta(hours=4),
                })
                target = {
                    "id": uuid.uuid4(), "customer_id": cust["id"], "subscription_id": None,
                    "amount": 4500.0 + i * 75, "currency": "INR", "status": PaymentStatus.failed,
                    "failure_reason": FailureReason.bank_timeout, "payment_method": "upi",
                    "retry_count": 0, "created_at": NOW - timedelta(hours=6 + i),
                }
                payments.append(target)
                target_payment_ids.add(target["id"])
                add_label(scenario_type, split, cust["id"], payment_id=target["id"], amount=target["amount"],
                          outcome_probability=0.88, expected_policy=PolicyStatus.auto,
                          expected_intervention=InterventionType.payment_retry)

            elif scenario_type == "low_recoverability_payment":
                cust = make_scenario_customer(idx, churn=0.82, ltv=700, days_back=170)
                customers.append(cust)
                payments.extend(failed_history(cust["id"], 4))
                target = {
                    "id": uuid.uuid4(), "customer_id": cust["id"], "subscription_id": None,
                    "amount": 1299.0, "currency": "INR", "status": PaymentStatus.failed,
                    "failure_reason": FailureReason.fraud_suspected, "payment_method": "card",
                    "retry_count": 3, "created_at": NOW - timedelta(days=40 + i),
                }
                payments.append(target)
                target_payment_ids.add(target["id"])
                add_label(scenario_type, split, cust["id"], payment_id=target["id"], recoverable=False,
                          outcome_probability=0.08, expected_policy=PolicyStatus.blocked,
                          expected_intervention=InterventionType.no_action)

            elif scenario_type == "checkout_high_intent":
                cust = make_scenario_customer(idx, churn=0.12, ltv=14000)
                customers.append(cust)
                payments.extend(successful_history(cust["id"], 5, amount=1999))
                started = NOW - timedelta(hours=2 + i)
                checkout = {
                    "id": uuid.uuid4(), "customer_id": cust["id"], "amount": 6200.0 + i * 50,
                    "currency": "INR", "status": CheckoutStatus.abandoned,
                    "started_at": started, "abandoned_at": started + timedelta(minutes=34),
                }
                checkouts.append(checkout)
                target_checkout_ids.add(checkout["id"])
                add_label(scenario_type, split, cust["id"], checkout_id=checkout["id"], amount=checkout["amount"],
                          outcome_probability=0.64, expected_policy=PolicyStatus.approval_required,
                          expected_intervention=InterventionType.checkout_recovery_message,
                          notes={"checkout_duration_minutes": 34, "intent": "high"})

            elif scenario_type == "checkout_low_intent":
                started = NOW - timedelta(days=60 + i)
                checkout = {
                    "id": uuid.uuid4(), "customer_id": None, "amount": 399.0 + i,
                    "currency": "INR", "status": CheckoutStatus.abandoned,
                    "started_at": started, "abandoned_at": started + timedelta(minutes=2),
                }
                checkouts.append(checkout)
                target_checkout_ids.add(checkout["id"])
                add_label(scenario_type, split, checkout_id=checkout["id"], recoverable=False,
                          outcome_probability=0.09, expected_policy=PolicyStatus.blocked,
                          expected_intervention=InterventionType.no_action,
                          notes={"checkout_duration_minutes": 2, "intent": "low"})

            elif scenario_type in {"subscription_recovery", "subscription_non_recovery"}:
                recoverable = scenario_type == "subscription_recovery"
                cust = make_scenario_customer(idx, churn=0.15 if recoverable else 0.78, ltv=30000 if recoverable else 1200)
                customers.append(cust)
                sub = {
                    "id": uuid.uuid4(), "customer_id": cust["id"], "plan_name": "Scale" if recoverable else "Starter",
                    "mrr": 4999.0 if recoverable else 999.0, "status": SubscriptionStatus.past_due,
                    "current_period_end": NOW + timedelta(days=8), "created_at": NOW - timedelta(days=150),
                    "canceled_at": None,
                }
                subs.append(sub)
                payments.extend(successful_history(cust["id"], 5 if recoverable else 1, amount=sub["mrr"]))
                for j in range(1 if recoverable else 4):
                    payments.append({
                        "id": uuid.uuid4(), "customer_id": cust["id"], "subscription_id": sub["id"],
                        "amount": sub["mrr"], "currency": "INR", "status": PaymentStatus.failed,
                        "failure_reason": FailureReason.bank_timeout if recoverable else FailureReason.expired_card,
                        "payment_method": "card", "retry_count": j if not recoverable else 0,
                        "created_at": NOW - timedelta(days=2 + j),
                    })
                add_label(scenario_type, split, cust["id"], subscription_id=sub["id"], recoverable=recoverable,
                          amount=sub["mrr"], outcome_probability=0.76 if recoverable else 0.16,
                          expected_policy=PolicyStatus.approval_required,
                          expected_intervention=InterventionType.subscription_recovery if recoverable else InterventionType.escalation)

            elif scenario_type == "human_approval_case":
                cust = make_scenario_customer(idx, churn=0.18, ltv=85000)
                customers.append(cust)
                payments.extend(successful_history(cust["id"], 8, amount=9999))
                target = {
                    "id": uuid.uuid4(), "customer_id": cust["id"], "subscription_id": None,
                    "amount": 32000.0 + i * 1000, "currency": "INR", "status": PaymentStatus.failed,
                    "failure_reason": FailureReason.insufficient_funds, "payment_method": "upi",
                    "retry_count": 1, "created_at": NOW - timedelta(hours=10 + i),
                }
                payments.append(target)
                target_payment_ids.add(target["id"])
                add_label(scenario_type, split, cust["id"], payment_id=target["id"], amount=target["amount"],
                          outcome_probability=0.62, expected_policy=PolicyStatus.escalated,
                          expected_intervention=InterventionType.delayed_retry)

            elif scenario_type == "do_nothing_case":
                cust = make_scenario_customer(idx, churn=0.9, ltv=300)
                customers.append(cust)
                payments.extend(failed_history(cust["id"], 5, reason=FailureReason.fraud_suspected))
                target = {
                    "id": uuid.uuid4(), "customer_id": cust["id"], "subscription_id": None,
                    "amount": 899.0, "currency": "INR", "status": PaymentStatus.failed,
                    "failure_reason": FailureReason.fraud_suspected, "payment_method": "card",
                    "retry_count": 3, "created_at": NOW - timedelta(days=30 + i),
                }
                payments.append(target)
                target_payment_ids.add(target["id"])
                add_label(scenario_type, split, cust["id"], payment_id=target["id"], recoverable=False,
                          outcome_probability=0.04, expected_policy=PolicyStatus.blocked,
                          expected_intervention=InterventionType.no_action)

    return customers, subs, payments, checkouts, attempts, labels, target_payment_ids, target_checkout_ids


def make_recovery_attempts(failed_payments, abandoned_sessions, excluded_payment_ids=None, excluded_checkout_ids=None):
    attempts = []
    excluded_payment_ids = excluded_payment_ids or set()
    excluded_checkout_ids = excluded_checkout_ids or set()

    for p in failed_payments:
        if p["id"] in excluded_payment_ids:
            continue
        if random.random() > 0.7:
            continue
        method = random.choices(
            [RecoveryMethod.auto_retry, RecoveryMethod.email, RecoveryMethod.sms, RecoveryMethod.manual],
            weights=[0.5, 0.3, 0.15, 0.05],
            k=1,
        )[0]
        succeeded = random.random() < 0.42
        created = p["created_at"] + timedelta(hours=random.randint(1, 48))
        attempts.append({
            "id": uuid.uuid4(),
            "payment_id": p["id"],
            "checkout_session_id": None,
            "method": method,
            "status": RecoveryStatus.succeeded if succeeded else RecoveryStatus.failed,
            "recovered_amount": p["amount"] if succeeded else None,
            "created_at": created,
            "resolved_at": created + timedelta(hours=random.randint(1, 24)),
        })

    for s in abandoned_sessions:
        if s["id"] in excluded_checkout_ids:
            continue
        if random.random() > 0.55:
            continue
        method = random.choices(
            [RecoveryMethod.email, RecoveryMethod.sms],
            weights=[0.75, 0.25],
            k=1,
        )[0]
        succeeded = random.random() < 0.22
        created = s["abandoned_at"] + timedelta(hours=random.randint(1, 72))
        attempts.append({
            "id": uuid.uuid4(),
            "payment_id": None,
            "checkout_session_id": s["id"],
            "method": method,
            "status": RecoveryStatus.succeeded if succeeded else RecoveryStatus.failed,
            "recovered_amount": s["amount"] if succeeded else None,
            "created_at": created,
            "resolved_at": created + timedelta(hours=random.randint(1, 48)),
        })

    return attempts


def bulk_insert(session, model, rows, chunk_size=2000):
    for i in range(0, len(rows), chunk_size):
        session.bulk_insert_mappings(model, rows[i:i + chunk_size])
        session.commit()
        print(f"  inserted {min(i + chunk_size, len(rows))}/{len(rows)} into {model.__tablename__}")


REVENUE_TABLES = [
    RevenueEvent.__table__, GroundTruthScenario.__table__, RecoveryAttempt.__table__,
    RecoveryOpportunity.__table__, CheckoutSession.__table__, Payment.__table__,
    Subscription.__table__, Customer.__table__,
]


def run(n_customers, wipe):
    session = SessionLocal()

    if wipe:
        print("Dropping and recreating revenue tables only (merchants table untouched)...")
        Base.metadata.drop_all(bind=engine, tables=REVENUE_TABLES)
    Base.metadata.create_all(bind=engine, tables=REVENUE_TABLES)

    print(f"Generating {n_customers} customers...")
    customers = make_customers(n_customers)
    scenario_customers, scenario_subs, scenario_payments, scenario_checkouts, scenario_attempts, labels, target_payment_ids, target_checkout_ids = make_ground_truth_scenarios(n_customers)
    customers.extend(scenario_customers)
    bulk_insert(session, Customer, customers)

    subscribed = random.sample(customers, k=int(n_customers * 0.64))

    print("Generating subscriptions + subscription payments...")
    all_subs = []
    all_payments = []
    plan_by_customer = {}

    for cust in subscribed:
        sub, mrr, plan_name = make_subscription(cust["id"], cust["created_at"])
        all_subs.append(sub)
        plan_by_customer[cust["id"]] = plan_name
        all_payments.extend(make_subscription_payments(sub))

    all_subs.extend(scenario_subs)

    bulk_insert(session, Subscription, all_subs)

    print("Generating one-off payments for non-subscription and mixed customers...")
    for cust in customers:
        n_oneoffs = random.choices([0, 1, 2, 3, 4], weights=[0.35, 0.3, 0.2, 0.1, 0.05])[0]
        if n_oneoffs:
            all_payments.extend(make_oneoff_payments(cust["id"], cust["created_at"], n_oneoffs))

    all_payments.extend(scenario_payments)

    bulk_insert(session, Payment, all_payments)

    print("Backfilling customer plan + lifetime value...")
    lifetime_value = {}
    for p in all_payments:
        if p["status"] in (PaymentStatus.succeeded,):
            lifetime_value[p["customer_id"]] = lifetime_value.get(p["customer_id"], 0.0) + p["amount"]

    for cust in customers:
        updates = {"lifetime_value": round(lifetime_value.get(cust["id"], 0.0), 2)}
        if cust["id"] in plan_by_customer:
            updates["plan"] = plan_by_customer[cust["id"]]
        session.query(Customer).filter(Customer.id == cust["id"]).update(updates)
    session.commit()

    print("Generating checkout sessions...")
    customer_ids = [c["id"] for c in customers]
    checkout_sessions = make_checkout_sessions(customer_ids, guest_count=int(n_customers * 0.3))
    checkout_sessions.extend(scenario_checkouts)
    bulk_insert(session, CheckoutSession, checkout_sessions)

    print("Generating recovery attempts...")
    failed_payments = [p for p in all_payments if p["status"] == PaymentStatus.failed]
    abandoned_sessions = [s for s in checkout_sessions if s["status"] == CheckoutStatus.abandoned]
    attempts = make_recovery_attempts(failed_payments, abandoned_sessions, target_payment_ids, target_checkout_ids)
    attempts.extend(scenario_attempts)
    bulk_insert(session, RecoveryAttempt, attempts)

    print("Writing held-out/train ground-truth labels...")
    bulk_insert(session, GroundTruthScenario, labels)

    session.close()

    print("\nDone.")
    print(f"  customers:          {len(customers)}")
    print(f"  subscriptions:      {len(all_subs)}")
    print(f"  payments:           {len(all_payments)}  ({len(failed_payments)} failed)")
    print(f"  checkout sessions:  {len(checkout_sessions)}  ({len(abandoned_sessions)} abandoned)")
    print(f"  recovery attempts:  {len(attempts)}")
    print(f"  ground truth labels: {len(labels)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--wipe", action="store_true")
    parser.add_argument("--small", action="store_true")
    args = parser.parse_args()

    run(n_customers=500 if args.small else 5000, wipe=args.wipe)
