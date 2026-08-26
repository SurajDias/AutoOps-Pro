"""Create the incident table without replacing an existing deployment table.

Revision ID: 20260826_01
Revises:
Create Date: 2026-08-26
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260826_01"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_INCIDENT_COLUMNS = {
    "id",
    "service_name",
    "severity",
    "anomaly_type",
    "root_cause",
    "recommendation",
    "status",
    "timestamp",
}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("incidents"):
        existing_columns = {column["name"] for column in inspector.get_columns("incidents")}
        missing_columns = _INCIDENT_COLUMNS - existing_columns
        if missing_columns:
            raise RuntimeError(
                "Existing incidents table is not compatible with the baseline migration; "
                f"missing columns: {', '.join(sorted(missing_columns))}."
            )
        return

    op.create_table(
        "incidents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("service_name", sa.String(), nullable=False),
        sa.Column("severity", sa.String(), nullable=False),
        sa.Column("anomaly_type", sa.String(), nullable=False),
        sa.Column("root_cause", sa.String(), nullable=False),
        sa.Column("recommendation", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=False), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_incidents_id", "incidents", ["id"], unique=False)


def downgrade() -> None:
    raise RuntimeError(
        "The initial incident migration is intentionally non-destructive; "
        "do not downgrade it because it may contain production incident history."
    )
