"""performance indexes for hot payment/subscription/opportunity paths

Revision ID: 202608260003
Revises: 202608260002
Create Date: 2026-08-26
"""
from alembic import op
from sqlalchemy import inspect

revision = "202608260003"
down_revision = "202608260002"
branch_labels = None
depends_on = None


INDEXES = [
    ("ix_payments_status", "payments", ["status"]),
    ("ix_payments_customer_id", "payments", ["customer_id"]),
    ("ix_payments_created_at", "payments", ["created_at"]),
    ("ix_payments_status_created_at", "payments", ["status", "created_at"]),
    ("ix_subscriptions_status", "subscriptions", ["status"]),
    ("ix_subscriptions_customer_id", "subscriptions", ["customer_id"]),
    ("ix_checkout_sessions_status", "checkout_sessions", ["status"]),
    ("ix_checkout_sessions_started_at", "checkout_sessions", ["started_at"]),
    ("ix_recovery_opportunities_action_status", "recovery_opportunities", ["action_status"]),
    ("ix_recovery_opportunities_confidence", "recovery_opportunities", ["confidence"]),
    ("ix_recovery_opportunities_expected_recovery", "recovery_opportunities", ["expected_recovery_value"]),
    ("ix_recovery_opportunities_created_at", "recovery_opportunities", ["created_at"]),
    ("ix_recovery_attempts_status", "recovery_attempts", ["status"]),
    ("ix_recovery_attempts_payment_id", "recovery_attempts", ["payment_id"]),
]


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())

    for name, table, cols in INDEXES:
        if table not in existing_tables:
            continue
        existing = {ix["name"] for ix in inspector.get_indexes(table)}
        if name in existing:
            continue
        op.create_index(name, table, cols)


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())
    for name, table, _ in reversed(INDEXES):
        if table not in existing_tables:
            continue
        existing = {ix["name"] for ix in inspector.get_indexes(table)}
        if name in existing:
            op.drop_index(name, table_name=table)
