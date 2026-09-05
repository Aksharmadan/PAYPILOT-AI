import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Enum, Text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class SubscriptionStatus(str, enum.Enum):
    trialing = "trialing"
    active = "active"
    past_due = "past_due"
    canceled = "canceled"
    paused = "paused"


class PaymentStatus(str, enum.Enum):
    succeeded = "succeeded"
    failed = "failed"
    refunded = "refunded"
    pending = "pending"


class FailureReason(str, enum.Enum):
    card_declined = "card_declined"
    insufficient_funds = "insufficient_funds"
    expired_card = "expired_card"
    processing_error = "processing_error"
    fraud_suspected = "fraud_suspected"
    bank_timeout = "bank_timeout"


class CheckoutStatus(str, enum.Enum):
    completed = "completed"
    abandoned = "abandoned"
    expired = "expired"


class RecoveryMethod(str, enum.Enum):
    email = "email"
    sms = "sms"
    auto_retry = "auto_retry"
    manual = "manual"


class RecoveryStatus(str, enum.Enum):
    sent = "sent"
    succeeded = "succeeded"
    failed = "failed"
    pending = "pending"


class DatasetSplit(str, enum.Enum):
    train = "train"
    heldout = "heldout"


class OpportunitySource(str, enum.Enum):
    payment = "payment"
    checkout = "checkout"
    subscription = "subscription"


class OpportunityPriority(str, enum.Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class OpportunityConfidence(str, enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"


class InterventionType(str, enum.Enum):
    payment_retry = "payment_retry"
    delayed_retry = "delayed_retry"
    payment_method_update = "payment_method_update"
    checkout_recovery_message = "checkout_recovery_message"
    personalized_offer = "personalized_offer"
    subscription_recovery = "subscription_recovery"
    escalation = "escalation"
    no_action = "no_action"


class PolicyStatus(str, enum.Enum):
    auto = "auto"
    approval_required = "approval_required"
    escalated = "escalated"
    blocked = "blocked"


class ActionStatus(str, enum.Enum):
    open = "open"
    approved = "approved"
    rejected = "rejected"
    executing = "executing"
    completed = "completed"
    failed = "failed"


class OpportunityOutcome(str, enum.Enum):
    pending = "pending"
    recovered = "recovered"
    not_recovered = "not_recovered"
    no_action = "no_action"


class Customer(Base):
    __tablename__ = "customers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    country = Column(String, nullable=True)
    plan = Column(String, nullable=True)
    lifetime_value = Column(Float, default=0.0)
    churn_risk_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    plan_name = Column(String, nullable=False)
    mrr = Column(Float, nullable=False)
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.active)
    current_period_end = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    canceled_at = Column(DateTime, nullable=True)


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.id"), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    status = Column(Enum(PaymentStatus), default=PaymentStatus.succeeded)
    failure_reason = Column(Enum(FailureReason), nullable=True)
    payment_method = Column(String, nullable=True)
    retry_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class CheckoutSession(Base):
    __tablename__ = "checkout_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    status = Column(Enum(CheckoutStatus), default=CheckoutStatus.completed)
    started_at = Column(DateTime, default=datetime.utcnow)
    abandoned_at = Column(DateTime, nullable=True)


class RecoveryAttempt(Base):
    __tablename__ = "recovery_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    opportunity_id = Column(UUID(as_uuid=True), ForeignKey("recovery_opportunities.id"), nullable=True, unique=True)
    payment_id = Column(UUID(as_uuid=True), ForeignKey("payments.id"), nullable=True)
    checkout_session_id = Column(UUID(as_uuid=True), ForeignKey("checkout_sessions.id"), nullable=True)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.id"), nullable=True)
    method = Column(Enum(RecoveryMethod), nullable=False)
    intervention = Column(Enum(InterventionType), nullable=True)
    status = Column(Enum(RecoveryStatus), default=RecoveryStatus.pending)
    recovered_amount = Column(Float, nullable=True)
    failure_reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)


class RecoveryOpportunity(Base):
    __tablename__ = "recovery_opportunities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source = Column(Enum(OpportunitySource), nullable=False, index=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True, index=True)
    payment_id = Column(UUID(as_uuid=True), ForeignKey("payments.id"), nullable=True, unique=True)
    checkout_session_id = Column(UUID(as_uuid=True), ForeignKey("checkout_sessions.id"), nullable=True, unique=True)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.id"), nullable=True, unique=True)
    amount_at_risk = Column(Float, nullable=False)
    recovery_probability = Column(Float, nullable=False)
    intervention_success_probability = Column(Float, nullable=False)
    expected_recovery_value = Column(Float, nullable=False)
    priority = Column(Enum(OpportunityPriority), nullable=False)
    confidence = Column(Enum(OpportunityConfidence), nullable=False)
    recommended_intervention = Column(Enum(InterventionType), nullable=False)
    reason_codes = Column(Text, nullable=False, default="[]")
    supporting_evidence = Column(Text, nullable=False, default="{}")
    policy_status = Column(Enum(PolicyStatus), nullable=False)
    policy_version = Column(String, nullable=False, default="policy_v1")
    policy_checks = Column(Text, nullable=False, default="[]")
    action_status = Column(Enum(ActionStatus), nullable=False, default=ActionStatus.open)
    outcome = Column(Enum(OpportunityOutcome), nullable=False, default=OpportunityOutcome.pending)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    executed_at = Column(DateTime, nullable=True)


class RevenueEvent(Base):
    __tablename__ = "revenue_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type = Column(String, nullable=False, index=True)
    entity_type = Column(String, nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    payload = Column(Text, nullable=False, default="{}")
    idempotency_key = Column(String, nullable=False, unique=True, index=True)
    correlation_id = Column(String, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class GroundTruthScenario(Base):
    __tablename__ = "ground_truth_scenarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scenario_type = Column(String, nullable=False, index=True)
    dataset_split = Column(Enum(DatasetSplit), nullable=False, index=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True, index=True)
    payment_id = Column(UUID(as_uuid=True), ForeignKey("payments.id"), nullable=True, unique=True)
    checkout_session_id = Column(UUID(as_uuid=True), ForeignKey("checkout_sessions.id"), nullable=True, unique=True)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.id"), nullable=True, unique=True)
    recoverable = Column(Integer, nullable=False)
    eventual_outcome = Column(String, nullable=False)
    recovery_amount = Column(Float, nullable=False, default=0.0)
    outcome_probability = Column(Float, nullable=False)
    expected_policy_status = Column(Enum(PolicyStatus), nullable=True)
    expected_intervention = Column(Enum(InterventionType), nullable=True)
    notes = Column(Text, nullable=False, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)
