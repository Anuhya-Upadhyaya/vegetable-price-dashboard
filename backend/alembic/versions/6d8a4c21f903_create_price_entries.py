"""create price entries table

Revision ID: 6d8a4c21f903
Revises: 359dd5f319d8
Create Date: 2026-10-09
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "6d8a4c21f903"
down_revision: Union[str, Sequence[str], None] = "359dd5f319d8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "price_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("vegetable", sa.String(length=80), nullable=False),
        sa.Column("price", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("unit", sa.String(length=20), nullable=False, server_default="kg"),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_price_entries_id", "price_entries", ["id"], unique=False)
    op.create_index("ix_price_entries_user_id", "price_entries", ["user_id"], unique=False)
    op.create_index("ix_price_entries_vegetable", "price_entries", ["vegetable"], unique=False)
    op.create_index("ix_price_entries_entry_date", "price_entries", ["entry_date"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_price_entries_entry_date", table_name="price_entries")
    op.drop_index("ix_price_entries_vegetable", table_name="price_entries")
    op.drop_index("ix_price_entries_user_id", table_name="price_entries")
    op.drop_index("ix_price_entries_id", table_name="price_entries")
    op.drop_table("price_entries")
