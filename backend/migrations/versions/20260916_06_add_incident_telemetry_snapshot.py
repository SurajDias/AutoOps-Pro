"""Add nullable immutable local telemetry to incident records.

Revision ID: 20260916_06
Revises: 20260910_05
Create Date: 2026-09-16
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260916_06"
down_revision: Union[str, None] = "20260910_05"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("incidents")}
    if "telemetry_snapshot" not in columns:
        op.add_column(
            "incidents",
            sa.Column("telemetry_snapshot", postgresql.JSONB(), nullable=True),
        )


def downgrade() -> None:
    raise RuntimeError("Incident telemetry is historical record; this migration is intentionally non-destructive.")
