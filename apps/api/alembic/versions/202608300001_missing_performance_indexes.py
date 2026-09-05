"""Add missing performance indexes on payments, subscriptions, recovery_attempts

Revision ID: 202608300001
Revises: 202608290001
Create Date: 2026-08-30
"""
from alembic import op

revision = "202608300001"
down_revision = "202608290001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Payments — these are hot query paths: list by status, filter by customer, sort by date
    op.create_index("ix_payments_status", "payments", ["status"], unique=False, if_not_exists=True)
    op.create_index("ix_payments_customer_id", "payments", ["customer_id"], unique=False, if_not_exists=True)
    op.create_index("ix_payments_created_at", "payments", ["created_at"], unique=False, if_not_exists=True)

    # Subscriptions — filtered by status on every at-risk and radar query
    op.create_index("ix_subscriptions_status", "subscriptions", ["status"], unique=False, if_not_exists=True)
    op.create_index("ix_subscriptions_customer_id", "subscriptions", ["customer_id"], unique=False, if_not_exists=True)
    op.create_index("ix_subscriptions_current_period_end", "subscriptions", ["current_period_end"], unique=False, if_not_exists=True)

    # Recovery attempts — joined for cooldown checks and contact-count queries
    op.create_index("ix_recovery_attempts_payment_id", "recovery_attempts", ["payment_id"], unique=False, if_not_exists=True)
    op.create_index("ix_recovery_attempts_status", "recovery_attempts", ["status"], unique=False, if_not_exists=True)
    op.create_index("ix_recovery_attempts_created_at", "recovery_attempts", ["created_at"], unique=False, if_not_exists=True)

    # Recovery opportunities — sorted by expected_recovery_value on every list call
    op.create_index("ix_recovery_opps_expected_recovery", "recovery_opportunities", ["expected_recovery_value"], unique=False, if_not_exists=True)
    op.create_index("ix_recovery_opps_action_status", "recovery_opportunities", ["action_status"], unique=False, if_not_exists=True)
    op.create_index("ix_recovery_opps_outcome", "recovery_opportunities", ["outcome"], unique=False, if_not_exists=True)
    op.create_index("ix_recovery_opps_created_at", "recovery_opportunities", ["created_at"], unique=False, if_not_exists=True)

    # Customers — sorted by LTV on most customer queries
    op.create_index("ix_customers_lifetime_value", "customers", ["lifetime_value"], unique=False, if_not_exists=True)

    # Revenue events — filtered by correlation_id for audit timeline grouping
    op.create_index("ix_revenue_events_created_at", "revenue_events", ["created_at"], unique=False, if_not_exists=True)


def downgrade() -> None:
    op.drop_index("ix_payments_status", table_name="payments")
    op.drop_index("ix_payments_customer_id", table_name="payments")
    op.drop_index("ix_payments_created_at", table_name="payments")
    op.drop_index("ix_subscriptions_status", table_name="subscriptions")
    op.drop_index("ix_subscriptions_customer_id", table_name="subscriptions")
    op.drop_index("ix_subscriptions_current_period_end", table_name="subscriptions")
    op.drop_index("ix_recovery_attempts_payment_id", table_name="recovery_attempts")
    op.drop_index("ix_recovery_attempts_status", table_name="recovery_attempts")
    op.drop_index("ix_recovery_attempts_created_at", table_name="recovery_attempts")
    op.drop_index("ix_recovery_opps_expected_recovery", table_name="recovery_opportunities")
    op.drop_index("ix_recovery_opps_action_status", table_name="recovery_opportunities")
    op.drop_index("ix_recovery_opps_outcome", table_name="recovery_opportunities")
    op.drop_index("ix_recovery_opps_created_at", table_name="recovery_opportunities")
    op.drop_index("ix_customers_lifetime_value", table_name="customers")
    op.drop_index("ix_revenue_events_created_at", table_name="revenue_events")
