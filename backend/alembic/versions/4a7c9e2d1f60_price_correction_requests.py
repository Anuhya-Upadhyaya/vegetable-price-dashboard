"""create price correction request workflow

Revision ID: 4a7c9e2d1f60
Revises: 9c2d7e4a1b63
Create Date: 2026-10-14
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "4a7c9e2d1f60"
down_revision: Union[str, Sequence[str], None] = "9c2d7e4a1b63"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "price_correction_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("entry_id", sa.Integer(), sa.ForeignKey("price_entries.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("submitter_name", sa.String(length=150), nullable=False),
        sa.Column("original_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("original_notes", sa.Text(), nullable=True),
        sa.Column("proposed_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("proposed_notes", sa.Text(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("reviewed_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_price_correction_requests_id", "price_correction_requests", ["id"])
    op.create_index("ix_price_correction_requests_entry_id", "price_correction_requests", ["entry_id"])
    op.create_index("ix_price_correction_requests_user_id", "price_correction_requests", ["user_id"])
    op.create_index("ix_price_correction_requests_status", "price_correction_requests", ["status"])


def downgrade() -> None:
    op.drop_index("ix_price_correction_requests_status", table_name="price_correction_requests")
    op.drop_index("ix_price_correction_requests_user_id", table_name="price_correction_requests")
    op.drop_index("ix_price_correction_requests_entry_id", table_name="price_correction_requests")
    op.drop_index("ix_price_correction_requests_id", table_name="price_correction_requests")
    op.drop_table("price_correction_requests")
