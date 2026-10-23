"""track when price entries are updated by approved corrections

Revision ID: d2e6a8b14c90
Revises: 4a7c9e2d1f60
Create Date: 2026-10-15
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d2e6a8b14c90"
down_revision: Union[str, Sequence[str], None] = "4a7c9e2d1f60"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "price_entries",
        sa.Column("last_updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "price_entries",
        sa.Column(
            "is_updated",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.alter_column("price_entries", "is_updated", server_default=None)


def downgrade() -> None:
    op.drop_column("price_entries", "is_updated")
    op.drop_column("price_entries", "last_updated_at")
