"""Create recommendation_executions table for Phase 8A.

Revision ID: 20260910_05
Revises: 20260903_04
Create Date: 2026-09-10
"""

from alembic import op
import sqlalchemy as sa


revision = "20260910_05"
down_revision = "20260903_04"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("recommendation_executions"):
        return

    op.create_table(
        "recommendation_executions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("incident_id", sa.Integer(), nullable=False),
        sa.Column("recommendation", sa.String(), nullable=False),
        sa.Column("execution_status", sa.String(), nullable=False),
        sa.Column("execution_method", sa.String(), nullable=True),
        sa.Column("actor", sa.String(), nullable=True),
        sa.Column("attempt_number", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("error_code", sa.String(), nullable=True),
        sa.Column("error_message", sa.String(length=1000), nullable=True),
        sa.Column("outcome_status", sa.String(), nullable=True),
        sa.Column("outcome_assessed_by", sa.String(), nullable=True),
        sa.Column("outcome_assessed_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["incident_id"], ["incidents.id"]),
        sa.UniqueConstraint("incident_id", "attempt_number", name="uq_recommendation_exec_incident_attempt"),
        sa.CheckConstraint("attempt_number >= 1", name="ck_recommendation_exec_attempt_positive"),
    )

    # Indexes for efficient lookup
    op.create_index("ix_recommendation_executions_incident_id", "recommendation_executions", ["incident_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("recommendation_executions"):
        op.drop_index("ix_recommendation_executions_incident_id", table_name="recommendation_executions")
        op.drop_table("recommendation_executions")