"""Add the persisted incident resolution timestamp.

Revision ID: 20260903_03
Revises: 20260903_02
Create Date: 2026-09-03
"""

from alembic import op
import sqlalchemy as sa


revision = "20260903_03"
down_revision = "20260903_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("incidents")}
    if "resolved_at" not in columns:
        op.add_column("incidents", sa.Column("resolved_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    raise RuntimeError("Incident lifecycle history is intentionally non-destructive.")
