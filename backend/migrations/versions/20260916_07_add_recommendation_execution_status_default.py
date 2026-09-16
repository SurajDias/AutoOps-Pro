"""Give recommendation executions a default planned status.

Revision ID: 20260916_07
Revises: 20260916_06
Create Date: 2026-09-16
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260916_07"
down_revision: Union[str, None] = "20260916_06"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("recommendation_executions"):
        op.alter_column(
            "recommendation_executions",
            "execution_status",
            existing_type=sa.String(),
            existing_nullable=False,
            server_default=sa.text("'PLANNED'"),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("recommendation_executions"):
        op.alter_column(
            "recommendation_executions",
            "execution_status",
            existing_type=sa.String(),
            existing_nullable=False,
            server_default=None,
        )
