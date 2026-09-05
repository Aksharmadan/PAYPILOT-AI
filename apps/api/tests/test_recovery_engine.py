import unittest
import uuid
from datetime import datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.merchant import Merchant
from app.models.policy import MerchantPolicy
from app.models.revenue import (
    ActionStatus,
    CheckoutSession,
    CheckoutStatus,
    Customer,
    DatasetSplit,
    FailureReason,
    GroundTruthScenario,
    InterventionType,
    Payment,
    PaymentStatus,
    PolicyStatus,
    RecoveryAttempt,
    RecoveryOpportunity,
)
from app.services.opportunity_engine import (
    evaluate_policy,
    execute_opportunity,
    record_event,
    refresh_opportunities,
)
from app.services.risk_scoring import priority_for, score_payment_opportunity


class RecoveryEngineTest(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        self.Session = sessionmaker(bind=engine)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()

    def customer(self, churn=0.1, lifetime_value=20000):
        customer = Customer(
            id=uuid.uuid4(),
            name="Test Customer",
            email=f"{uuid.uuid4()}@example.test",
            country="India",
            lifetime_value=lifetime_value,
            churn_risk_score=churn,
            created_at=datetime.utcnow() - timedelta(days=120),
        )
        self.db.add(customer)
        self.db.commit()
        return customer

    def payment(self, customer, amount=2500, reason=FailureReason.bank_timeout, retry_count=0):
        payment = Payment(
            id=uuid.uuid4(),
            customer_id=customer.id,
            amount=amount,
            currency="INR",
            status=PaymentStatus.failed,
            failure_reason=reason,
            payment_method="upi",
            retry_count=retry_count,
            created_at=datetime.utcnow() - timedelta(hours=2),
        )
        self.db.add(payment)
        self.db.commit()
        return payment

    def test_expected_value_and_priority_are_calculated_from_features(self):
        customer = self.customer()
        payment = self.payment(customer, amount=4000)
        score = score_payment_opportunity(payment, customer, prior_recovery_success=True)
        self.assertGreater(score["recovery_probability"], 0)
        self.assertEqual(
            score["expected_recovery_value"],
            round(payment.amount * score["recovery_probability"] * score["intervention_success_probability"], 2),
        )
        self.assertEqual(priority_for(20000, 100), "critical")
        self.assertEqual(priority_for(1000, 800), "medium")

    def test_policy_auto_approval_escalation_and_blocked(self):
        customer = self.customer()
        payment = self.payment(customer, amount=2500)
        auto_score = {"recommended_intervention": "payment_retry", "confidence": "high", "recovery_probability": 0.82, "priority": "medium"}
        status, _ = evaluate_policy(self.db, "payment", payment.amount, auto_score, payment, customer.id)
        self.assertEqual(status, PolicyStatus.auto)

        approval_score = {"recommended_intervention": "delayed_retry", "confidence": "medium", "recovery_probability": 0.58, "priority": "medium"}
        status, _ = evaluate_policy(self.db, "payment", 8000, approval_score, None, customer.id)
        self.assertEqual(status, PolicyStatus.approval_required)

        status, _ = evaluate_policy(self.db, "payment", 32000, approval_score, None, customer.id)
        self.assertEqual(status, PolicyStatus.escalated)

        blocked_score = {"recommended_intervention": "no_action", "confidence": "low", "recovery_probability": 0.05, "priority": "low"}
        status, checks = evaluate_policy(self.db, "payment", 500, blocked_score, payment, customer.id)
        self.assertEqual(status, PolicyStatus.blocked)
        self.assertFalse(all(check["passed"] for check in checks))

    def test_duplicate_event_prevention(self):
        entity_id = uuid.uuid4()
        record_event(self.db, "test.event", "test", entity_id, {"n": 1}, "same-key")
        record_event(self.db, "test.event", "test", entity_id, {"n": 2}, "same-key")
        self.db.commit()
        self.assertEqual(self.db.execute(text("select count(*) from revenue_events")).scalar(), 1)

    def test_refresh_opportunities_and_execute_are_idempotent(self):
        customer = self.customer()
        payment = self.payment(customer, amount=4500)
        truth = GroundTruthScenario(
            id=uuid.uuid4(),
            scenario_type="highly_recoverable_payment",
            dataset_split=DatasetSplit.heldout,
            customer_id=customer.id,
            payment_id=payment.id,
            recoverable=1,
            eventual_outcome="recovered",
            recovery_amount=payment.amount,
            outcome_probability=0.9,
            expected_policy_status=PolicyStatus.auto,
            expected_intervention=InterventionType.payment_retry,
            notes="{}",
            created_at=datetime.utcnow(),
        )
        self.db.add(truth)
        self.db.commit()

        refresh_opportunities(self.db)
        opp = self.db.query(RecoveryOpportunity).filter(RecoveryOpportunity.payment_id == payment.id).one()
        first = execute_opportunity(self.db, opp, force_outcome="success")
        second = execute_opportunity(self.db, opp, force_outcome="success")
        self.assertEqual(first.action_status, ActionStatus.completed)
        self.assertEqual(second.action_status, ActionStatus.completed)
        self.assertEqual(self.db.query(RecoveryAttempt).filter(RecoveryAttempt.opportunity_id == opp.id).count(), 1)

    def test_edge_cases_zero_amount_missing_customer_and_checkout(self):
        score = priority_for(0, 0)
        self.assertEqual(score, "low")
        checkout = CheckoutSession(
            id=uuid.uuid4(),
            customer_id=None,
            amount=399,
            currency="INR",
            status=CheckoutStatus.abandoned,
            started_at=datetime.utcnow() - timedelta(days=90),
            abandoned_at=datetime.utcnow() - timedelta(days=90),
        )
        self.db.add(checkout)
        self.db.commit()
        refresh_opportunities(self.db)
        opp = self.db.query(RecoveryOpportunity).filter(RecoveryOpportunity.checkout_session_id == checkout.id).one()
        self.assertEqual(opp.customer_id, None)
        self.assertIn(opp.policy_status, {PolicyStatus.blocked, PolicyStatus.approval_required})


if __name__ == "__main__":
    unittest.main()
