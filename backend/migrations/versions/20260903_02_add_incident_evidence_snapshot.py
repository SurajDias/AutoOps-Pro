"""Add immutable incident-time diagnostic evidence.

Revision ID: 20260903_02
Revises: 20260826_01
Create Date: 2026-09-03
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260903_02"
down_revision = "20260826_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("incidents")}
    if "evidence_snapshot" not in columns:
        op.add_column("incidents", sa.Column("evidence_snapshot", postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    raise RuntimeError("Incident evidence is historical record; this migration is intentionally non-destructive.")
