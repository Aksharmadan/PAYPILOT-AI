"""create merchant_policies table

Revision ID: 202608290001
Revises: 202608260003
Create Date: 2026-08-29
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect

revision = "202608290001"
down_revision = "202608260003"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())

    if "merchant_policies" not in tables:
        op.create_table(
            "merchant_policies",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("merchant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False, unique=True),
            sa.Column("max_retry_count", sa.Integer(), nullable=False, server_default="3"),
            sa.Column("retry_cooldown_hours", sa.Integer(), nullable=False, server_default="12"),
            sa.Column("auto_amount_limit", sa.Float(), nullable=False, server_default="5000.0"),
            sa.Column("approval_amount_limit", sa.Float(), nullable=False, server_default="25000.0"),
            sa.Column("contact_limit_per_customer", sa.Integer(), nullable=False, server_default="3"),
            sa.Column("min_confidence_for_auto", sa.Float(), nullable=False, server_default="0.7"),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_merchant_policies_merchant_id", "merchant_policies", ["merchant_id"])


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())
    if "merchant_policies" in tables:
        op.drop_table("merchant_policies")
