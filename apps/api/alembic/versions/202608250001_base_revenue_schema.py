"""base revenue schema

Revision ID: 202608250001
Revises:
Create Date: 2026-08-25
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

revision = "202608250001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())

    subscription_status = postgresql.ENUM(
        "trialing", "active", "past_due", "canceled", "paused",
        name="subscriptionstatus",
        create_type=False,
    )
    payment_status = postgresql.ENUM(
        "succeeded", "failed", "refunded", "pending",
        name="paymentstatus",
        create_type=False,
    )
    failure_reason = postgresql.ENUM(
        "card_declined", "insufficient_funds", "expired_card",
        "processing_error", "fraud_suspected", "bank_timeout",
        name="failurereason",
        create_type=False,
    )
    checkout_status = postgresql.ENUM(
        "completed", "abandoned", "expired",
        name="checkoutstatus",
        create_type=False,
    )
    recovery_method = postgresql.ENUM(
        "email", "sms", "auto_retry", "manual",
        name="recoverymethod",
        create_type=False,
    )
    recovery_status = postgresql.ENUM(
        "sent", "succeeded", "failed", "pending",
        name="recoverystatus",
        create_type=False,
    )

    for enum in (
        subscription_status,
        payment_status,
        failure_reason,
        checkout_status,
        recovery_method,
        recovery_status,
    ):
        enum.create(bind, checkfirst=True)

    if "merchants" not in tables:
        op.create_table(
            "merchants",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("email", sa.String(), nullable=False, unique=True),
            sa.Column("hashed_password", sa.String(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_merchants_email", "merchants", ["email"])

    if "customers" not in tables:
        op.create_table(
            "customers",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("email", sa.String(), nullable=False, unique=True),
            sa.Column("country", sa.String(), nullable=True),
            sa.Column("plan", sa.String(), nullable=True),
            sa.Column("lifetime_value", sa.Float(), nullable=True),
            sa.Column("churn_risk_score", sa.Float(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_customers_email", "customers", ["email"])

    if "subscriptions" not in tables:
        op.create_table(
            "subscriptions",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False),
            sa.Column("plan_name", sa.String(), nullable=False),
            sa.Column("mrr", sa.Float(), nullable=False),
            sa.Column("status", subscription_status, nullable=True),
            sa.Column("current_period_end", sa.DateTime(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("canceled_at", sa.DateTime(), nullable=True),
        )

    if "payments" not in tables:
        op.create_table(
            "payments",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False),
            sa.Column("subscription_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subscriptions.id"), nullable=True),
            sa.Column("amount", sa.Float(), nullable=False),
            sa.Column("currency", sa.String(), nullable=True),
            sa.Column("status", payment_status, nullable=True),
            sa.Column("failure_reason", failure_reason, nullable=True),
            sa.Column("payment_method", sa.String(), nullable=True),
            sa.Column("retry_count", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
        )

    if "checkout_sessions" not in tables:
        op.create_table(
            "checkout_sessions",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=True),
            sa.Column("amount", sa.Float(), nullable=False),
            sa.Column("currency", sa.String(), nullable=True),
            sa.Column("status", checkout_status, nullable=True),
            sa.Column("started_at", sa.DateTime(), nullable=True),
            sa.Column("abandoned_at", sa.DateTime(), nullable=True),
        )

    if "recovery_attempts" not in tables:
        op.create_table(
            "recovery_attempts",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("payment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("payments.id"), nullable=True),
            sa.Column("checkout_session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("checkout_sessions.id"), nullable=True),
            sa.Column("method", recovery_method, nullable=False),
            sa.Column("status", recovery_status, nullable=True),
            sa.Column("recovered_amount", sa.Float(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("resolved_at", sa.DateTime(), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())

    for table in (
        "recovery_attempts",
        "checkout_sessions",
        "payments",
        "subscriptions",
        "customers",
        "merchants",
    ):
        if table in tables:
            op.drop_table(table)

    for name in (
        "recoverystatus",
        "recoverymethod",
        "checkoutstatus",
        "failurereason",
        "paymentstatus",
        "subscriptionstatus",
    ):
        postgresql.ENUM(name=name).drop(bind, checkfirst=True)
