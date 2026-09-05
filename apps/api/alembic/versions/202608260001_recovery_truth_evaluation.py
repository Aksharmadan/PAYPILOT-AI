"""recovery truth evaluation

Revision ID: 202608260001
Revises:
Create Date: 2026-08-26
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "202608260001"
down_revision = "202608250001"
branch_labels = None
depends_on = None


def upgrade():
    dataset_split = postgresql.ENUM("train", "heldout", name="datasetsplit", create_type=False)
    opportunity_source = postgresql.ENUM("payment", "checkout", "subscription", name="opportunitysource", create_type=False)
    opportunity_priority = postgresql.ENUM("critical", "high", "medium", "low", name="opportunitypriority", create_type=False)
    opportunity_confidence = postgresql.ENUM("high", "medium", "low", name="opportunityconfidence", create_type=False)
    intervention_type = postgresql.ENUM(
        "payment_retry", "delayed_retry", "payment_method_update",
        "checkout_recovery_message", "personalized_offer", "subscription_recovery",
        "escalation", "no_action", name="interventiontype", create_type=False
    )
    policy_status = postgresql.ENUM("auto", "approval_required", "escalated", "blocked", name="policystatus", create_type=False)
    action_status = postgresql.ENUM("open", "approved", "rejected", "executing", "completed", "failed", name="actionstatus", create_type=False)
    opportunity_outcome = postgresql.ENUM("pending", "recovered", "not_recovered", "no_action", name="opportunityoutcome", create_type=False)

    bind = op.get_bind()
    for enum in (
        dataset_split, opportunity_source, opportunity_priority, opportunity_confidence,
        intervention_type, policy_status, action_status, opportunity_outcome,
    ):
        enum.create(bind, checkfirst=True)

    op.create_table(
        "recovery_opportunities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("source", opportunity_source, nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=True),
        sa.Column("payment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("payments.id"), nullable=True, unique=True),
        sa.Column("checkout_session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("checkout_sessions.id"), nullable=True, unique=True),
        sa.Column("subscription_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subscriptions.id"), nullable=True, unique=True),
        sa.Column("amount_at_risk", sa.Float(), nullable=False),
        sa.Column("recovery_probability", sa.Float(), nullable=False),
        sa.Column("intervention_success_probability", sa.Float(), nullable=False),
        sa.Column("expected_recovery_value", sa.Float(), nullable=False),
        sa.Column("priority", opportunity_priority, nullable=False),
        sa.Column("confidence", opportunity_confidence, nullable=False),
        sa.Column("recommended_intervention", intervention_type, nullable=False),
        sa.Column("reason_codes", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("supporting_evidence", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("policy_status", policy_status, nullable=False),
        sa.Column("policy_version", sa.String(), nullable=False, server_default="policy_v1"),
        sa.Column("policy_checks", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("action_status", action_status, nullable=False, server_default="open"),
        sa.Column("outcome", opportunity_outcome, nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("executed_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_recovery_opportunities_source", "recovery_opportunities", ["source"])
    op.create_index("ix_recovery_opportunities_customer_id", "recovery_opportunities", ["customer_id"])

    op.add_column("recovery_attempts", sa.Column("opportunity_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("recovery_attempts", sa.Column("intervention", intervention_type, nullable=True))
    op.add_column("recovery_attempts", sa.Column("failure_reason", sa.String(), nullable=True))
    op.create_unique_constraint("uq_recovery_attempts_opportunity_id", "recovery_attempts", ["opportunity_id"])
    op.create_foreign_key(
        "fk_recovery_attempts_opportunity_id",
        "recovery_attempts", "recovery_opportunities",
        ["opportunity_id"], ["id"],
    )

    op.create_table(
        "revenue_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("entity_type", sa.String(), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("payload", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("idempotency_key", sa.String(), nullable=False, unique=True),
        sa.Column("correlation_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_revenue_events_event_type", "revenue_events", ["event_type"])
    op.create_index("ix_revenue_events_entity_id", "revenue_events", ["entity_id"])
    op.create_index("ix_revenue_events_idempotency_key", "revenue_events", ["idempotency_key"])
    op.create_index("ix_revenue_events_correlation_id", "revenue_events", ["correlation_id"])

    op.create_table(
        "ground_truth_scenarios",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("scenario_type", sa.String(), nullable=False),
        sa.Column("dataset_split", dataset_split, nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=True),
        sa.Column("payment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("payments.id"), nullable=True, unique=True),
        sa.Column("checkout_session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("checkout_sessions.id"), nullable=True, unique=True),
        sa.Column("subscription_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subscriptions.id"), nullable=True, unique=True),
        sa.Column("recoverable", sa.Integer(), nullable=False),
        sa.Column("eventual_outcome", sa.String(), nullable=False),
        sa.Column("recovery_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("outcome_probability", sa.Float(), nullable=False),
        sa.Column("expected_policy_status", policy_status, nullable=True),
        sa.Column("expected_intervention", intervention_type, nullable=True),
        sa.Column("notes", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_ground_truth_scenarios_scenario_type", "ground_truth_scenarios", ["scenario_type"])
    op.create_index("ix_ground_truth_scenarios_dataset_split", "ground_truth_scenarios", ["dataset_split"])
    op.create_index("ix_ground_truth_scenarios_customer_id", "ground_truth_scenarios", ["customer_id"])


def downgrade():
    op.drop_table("ground_truth_scenarios")
    op.drop_index("ix_revenue_events_correlation_id", table_name="revenue_events")
    op.drop_index("ix_revenue_events_idempotency_key", table_name="revenue_events")
    op.drop_index("ix_revenue_events_entity_id", table_name="revenue_events")
    op.drop_index("ix_revenue_events_event_type", table_name="revenue_events")
    op.drop_table("revenue_events")
    op.drop_constraint("fk_recovery_attempts_opportunity_id", "recovery_attempts", type_="foreignkey")
    op.drop_constraint("uq_recovery_attempts_opportunity_id", "recovery_attempts", type_="unique")
    op.drop_column("recovery_attempts", "failure_reason")
    op.drop_column("recovery_attempts", "intervention")
    op.drop_column("recovery_attempts", "opportunity_id")
    op.drop_index("ix_recovery_opportunities_customer_id", table_name="recovery_opportunities")
    op.drop_index("ix_recovery_opportunities_source", table_name="recovery_opportunities")
    op.drop_table("recovery_opportunities")

    bind = op.get_bind()
    for name in (
        "opportunityoutcome", "actionstatus", "policystatus", "interventiontype",
        "opportunityconfidence", "opportunitypriority", "opportunitysource", "datasetsplit",
    ):
        postgresql.ENUM(name=name).drop(bind, checkfirst=True)
