import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CustomerOut(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    country: Optional[str] = None
    plan: Optional[str] = None
    lifetime_value: float
    churn_risk_score: float
    created_at: datetime
    segment: Optional[str] = None

    class Config:
        from_attributes = True


class PaymentOut(BaseModel):
    id: uuid.UUID
    customer_id: uuid.UUID
    subscription_id: Optional[uuid.UUID] = None
    amount: float
    currency: str
    status: str
    failure_reason: Optional[str] = None
    payment_method: Optional[str] = None
    retry_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class SubscriptionOut(BaseModel):
    id: uuid.UUID
    customer_id: uuid.UUID
    plan_name: str
    mrr: float
    status: str
    current_period_end: datetime
    created_at: datetime
    canceled_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PaginatedResponse(BaseModel):
    total: int
    skip: int
    limit: int


class PaginatedCustomers(PaginatedResponse):
    items: list[CustomerOut]


class PaginatedPayments(PaginatedResponse):
    items: list[PaymentOut]


class PaginatedSubscriptions(PaginatedResponse):
    items: list[SubscriptionOut]


class RevenueAtRiskSource(BaseModel):
    source: str
    amount: float


class RevenueAtRiskOut(BaseModel):
    total_at_risk: float
    by_source: list[RevenueAtRiskSource]


class RevenueSummaryOut(BaseModel):
    revenue_period: float
    revenue_health_score: int
    revenue_at_risk: float
    high_confidence_recoverable: float
    recovered_period: float
    period_days: int


class DashboardOpportunityCard(BaseModel):
    id: uuid.UUID
    title: str
    source: str
    amount_at_risk: float
    recovery_probability: float
    expected_recovery_value: float
    confidence: str
    recommended_intervention: str
    href: str


class DashboardBriefingOut(BaseModel):
    headline: str
    insights: list[str]


class DashboardSummaryOut(BaseModel):
    period_days: int
    revenue_period: float
    previous_revenue_period: float
    revenue_delta_pct: Optional[float] = None
    revenue_health_score: int
    revenue_at_risk: float
    by_source: list[RevenueAtRiskSource]
    expected_recovery: float
    high_confidence_recoverable: float
    recovered_period: float
    recovery_rate: Optional[float] = None
    active_opportunities: int
    top_opportunities: list[DashboardOpportunityCard]
    briefing: DashboardBriefingOut


class SearchHitOut(BaseModel):
    id: str
    type: str
    title: str
    subtitle: Optional[str] = None
    href: str
    meta: Optional[str] = None


class SearchResultsOut(BaseModel):
    query: str
    total: int
    items: list[SearchHitOut]


class RiskItemOut(BaseModel):
    id: uuid.UUID
    type: str
    amount: float
    recoverability_score: float
    confidence: str
    reason: str


class RiskDistributionOut(BaseModel):
    high_confidence_amount: float
    medium_confidence_amount: float
    low_confidence_amount: float
    items: list[RiskItemOut]


class CopilotMessageIn(BaseModel):
    message: str


class CopilotMessageOut(BaseModel):
    reply: str
    tools_used: list[str] = []


class PolicyCheckOut(BaseModel):
    name: str
    passed: bool
    detail: str


class RecoveryOpportunityOut(BaseModel):
    id: uuid.UUID
    source: str
    customer_id: Optional[uuid.UUID] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    payment_id: Optional[uuid.UUID] = None
    checkout_session_id: Optional[uuid.UUID] = None
    subscription_id: Optional[uuid.UUID] = None
    amount_at_risk: float
    recovery_probability: float
    intervention_success_probability: float
    expected_recovery_value: float
    priority: str
    confidence: str
    recommended_intervention: str
    reason_codes: list[str]
    supporting_evidence: dict
    policy_status: str
    policy_version: str
    policy_checks: list[PolicyCheckOut]
    action_status: str
    outcome: str
    created_at: datetime
    updated_at: datetime
    executed_at: Optional[datetime] = None


class PaginatedRecoveryOpportunities(PaginatedResponse):
    items: list[RecoveryOpportunityOut]


class OpportunityActionIn(BaseModel):
    outcome: Optional[str] = None


class RevenueEventOut(BaseModel):
    id: uuid.UUID
    event_type: str
    entity_type: str
    entity_id: uuid.UUID
    payload: dict
    idempotency_key: str
    correlation_id: str
    created_at: datetime


class PaginatedRevenueEvents(PaginatedResponse):
    items: list[RevenueEventOut]


class RevenueLeakOut(BaseModel):
    title: str
    impact_amount: float
    cause: str
    confidence: str
    recommended_action: str
    potential_recovery: float


class RecommendationOut(BaseModel):
    title: str
    amount_at_risk: float
    avg_probability: float
    expected_recovery: float
    count: int


class SimulationIn(BaseModel):
    max_retries: int = 2
    auto_max_amount: float = 5000.0
    min_confidence_for_auto: float = 0.70
    min_retry_interval_minutes: int = 30


class SimulationOut(BaseModel):
    baseline_expected_recovery: float
    simulated_expected_recovery: float
    recovery_delta: float
    baseline_tiers: dict[str, int]
    simulated_tiers: dict[str, int]


class PolicyIn(BaseModel):
    max_retry_count: int
    retry_cooldown_hours: int
    auto_amount_limit: float
    approval_amount_limit: float
    contact_limit_per_customer: int
    min_confidence_for_auto: float


class PolicyOut(BaseModel):
    max_retry_count: int
    retry_cooldown_hours: int
    auto_amount_limit: float
    approval_amount_limit: float
    contact_limit_per_customer: int
    min_confidence_for_auto: float

    class Config:
        from_attributes = True


class RootCauseFactorOut(BaseModel):
    factor: str
    change: str
    impact_direction: str
    impact_weight: float
    explanation: str
    type: str


class RootCauseAnalysisOut(BaseModel):
    days: int
    revenue_change_pct: float
    revenue_delta: float
    factors: list[RootCauseFactorOut]
    summary_sentence: str

