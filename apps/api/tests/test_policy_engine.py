import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.merchant import Merchant
from app.models.policy import MerchantPolicy
from app.models.revenue import Customer, Payment, PaymentStatus, PolicyStatus
from app.services.policy_engine import evaluate_policy, evaluate_policy_custom

# In-memory SQLite database for testing
engine = create_engine("sqlite:///:memory:")
TestingSessionLocal = sessionmaker(bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


def test_evaluate_policy_defaults():
    db = TestingSessionLocal()
    try:
        # Create a customer and payment
        merchant = Merchant(name="Test Merchant", email="test@merchant.com", hashed_password="pw")
        db.add(merchant)
        db.commit()

        customer = Customer(
            name="Test Customer",
            email="cust@test.com",
            lifetime_value=100.0,
            churn_risk_score=0.1,
        )
        db.add(customer)
        db.commit()

        payment = Payment(
            customer_id=customer.id,
            amount=6000.0,
            currency="INR",
            status="failed",
            retry_count=4,  # default max is 3
        )
        db.add(payment)
        db.commit()

        score = {
            "recommended_intervention": "smart_retry",
            "confidence": "high",
            "priority": "high",
            "recovery_probability": 0.85,
        }

        # Policy should block because retry_count (4) >= max_retry_count (3)
        status, checks = evaluate_policy(db, "payment", 6000.0, score, payment, customer_id=customer.id)
        assert status == PolicyStatus.blocked
        
        # Verify checks fail
        retry_check = next(c for c in checks if c["name"] == "retry_count")
        assert retry_check["passed"] is False
    finally:
        db.close()


def test_evaluate_policy_custom_db_settings():
    db = TestingSessionLocal()
    try:
        merchant = Merchant(name="Test Merchant", email="test@merchant.com", hashed_password="pw")
        db.add(merchant)
        db.commit()

        # Save custom merchant policy with max_retry_count = 5
        policy = MerchantPolicy(
            merchant_id=merchant.id,
            max_retry_count=5,
            auto_amount_limit=10000.0,
        )
        db.add(policy)
        db.commit()

        customer = Customer(
            name="Test Customer",
            email="cust@test.com",
            lifetime_value=100.0,
            churn_risk_score=0.1,
        )
        db.add(customer)
        db.commit()

        payment = Payment(
            customer_id=customer.id,
            amount=8000.0,
            currency="INR",
            status="failed",
            retry_count=4,  # less than max 5 now!
        )
        db.add(payment)
        db.commit()

        score = {
            "recommended_intervention": "smart_retry",
            "confidence": "high",
            "priority": "high",
            "recovery_probability": 0.85,
        }

        # Now it should pass the retry limit and execute automatically (amount 8000 <= 10000)
        status, checks = evaluate_policy(db, "payment", 8000.0, score, payment, customer_id=customer.id)
        assert status == PolicyStatus.auto

        # Verify checks passed
        retry_check = next(c for c in checks if c["name"] == "retry_count")
        assert retry_check["passed"] is True
    finally:
        db.close()


def test_evaluate_policy_custom_simulator():
    # Evaluate policy custom (offline simulation without database states)
    eligible, checks, tier = evaluate_policy_custom(
        amount=3000.0,
        retry_count=1,
        failure_reason="insufficient_funds",
        score=0.85,
        last_attempt_at=None,
        max_retries=3,
        auto_max_amount=5000.0,
        min_confidence_for_auto=0.70,
    )
    assert eligible is True
    assert tier == "auto"

    # Should block if fraud suspected
    eligible, checks, tier = evaluate_policy_custom(
        amount=3000.0,
        retry_count=1,
        failure_reason="fraud_suspected",
        score=0.85,
        last_attempt_at=None,
    )
    assert eligible is False
    assert tier == "blocked"
