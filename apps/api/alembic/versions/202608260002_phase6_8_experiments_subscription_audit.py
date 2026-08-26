"""phase6_8 experiments subscription audit

Revision ID: 202608260002
Revises: 202608260001
Create Date: 2026-08-26
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect

revision = "202608260002"
down_revision = "202608260001"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())

    postgresql.ENUM("draft", "running", "completed", name="experimentstatus").create(bind, checkfirst=True)
    postgresql.ENUM("control", "treatment", name="experimentgroup").create(bind, checkfirst=True)

    if "experiments" not in tables:
        op.create_table(
            "experiments",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("population_filter", sa.String(), nullable=False),
            sa.Column("split_ratio", sa.Float(), nullable=False),
            sa.Column(
                "status",
                postgresql.ENUM("draft", "running", "completed", name="experimentstatus", create_type=False),
                nullable=False,
            ),
            sa.Column("started_at", sa.DateTime(), nullable=True),
            sa.Column("ended_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
        )

    if "experiment_assignments" not in tables:
        op.create_table(
            "experiment_assignments",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("experiment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("experiments.id"), nullable=False),
            sa.Column(
                "opportunity_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("recovery_opportunities.id"),
                nullable=True,
            ),
            sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("entity_type", sa.String(), nullable=False),
            sa.Column(
                "group",
                postgresql.ENUM("control", "treatment", name="experimentgroup", create_type=False),
                nullable=False,
            ),
            sa.Column("created_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_experiment_assignments_experiment_id", "experiment_assignments", ["experiment_id"])
        op.create_index("ix_experiment_assignments_opportunity_id", "experiment_assignments", ["opportunity_id"])
        op.create_index("ix_experiment_assignments_entity_id", "experiment_assignments", ["entity_id"])

    if "audit_decisions" not in tables:
        op.create_table(
            "audit_decisions",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("merchant_email", sa.String(), nullable=False),
            sa.Column(
                "opportunity_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("recovery_opportunities.id"),
                nullable=False,
            ),
            sa.Column("decision", sa.String(), nullable=False),
            sa.Column("outcome", sa.String(), nullable=True),
            sa.Column("payload", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("created_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_audit_decisions_merchant_email", "audit_decisions", ["merchant_email"])
        op.create_index("ix_audit_decisions_opportunity_id", "audit_decisions", ["opportunity_id"])
        op.create_index("ix_audit_decisions_created_at", "audit_decisions", ["created_at"])

    cols = {c["name"] for c in inspector.get_columns("recovery_attempts")} if "recovery_attempts" in tables else set()
    if "subscription_id" not in cols:
        op.add_column(
            "recovery_attempts",
            sa.Column("subscription_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subscriptions.id"), nullable=True),
        )


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())
    if "audit_decisions" in tables:
        op.drop_table("audit_decisions")
    if "experiment_assignments" in tables:
        op.drop_table("experiment_assignments")
    if "experiments" in tables:
        op.drop_table("experiments")
    op.execute("DROP TYPE IF EXISTS experimentgroup")
    op.execute("DROP TYPE IF EXISTS experimentstatus")
