"""Add one persisted operator-feedback record to incidents.

Revision ID: 20260903_04
Revises: 20260903_03
Create Date: 2026-09-03
"""

from alembic import op
import sqlalchemy as sa


revision = "20260903_04"
down_revision = "20260903_03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("incidents")}
    additions = (
        ("feedback_status", sa.String()),
        ("feedback_reason", sa.String(length=1000)),
        ("feedback_created_at", sa.DateTime()),
        ("feedback_action", sa.String()),
    )
    for name, column_type in additions:
        if name not in columns:
            op.add_column("incidents", sa.Column(name, column_type, nullable=True))


def downgrade() -> None:
    raise RuntimeError("Operator feedback is an audit record and is intentionally non-destructive.")
