"""add admin-managed active vegetables and timestamp fields

Revision ID: 7ab4d91c2e30
Revises: 6d8a4c21f903
Create Date: 2026-10-11
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "7ab4d91c2e30"
down_revision: Union[str, Sequence[str], None] = "6d8a4c21f903"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("vegetables", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("vegetables", sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_index("ix_vegetables_id", "vegetables", ["id"], unique=False)
    op.create_index("ix_vegetables_name", "vegetables", ["name"], unique=False)

    connection = op.get_bind()
    existing = {row[0].lower() for row in connection.execute(sa.text("SELECT name FROM vegetables")).all()}
    for name, unit, category in [
        ("Onion", "kg", "Root vegetables"),
        ("Potato", "kg", "Root vegetables"),
        ("Garlic", "kg", "Aromatics"),
        ("Ginger", "kg", "Aromatics"),
        ("Lemon", "piece", "Citrus"),
    ]:
        if name.lower() not in existing:
            connection.execute(
                sa.text("INSERT INTO vegetables (name, unit, category, is_active, created_at) VALUES (:name, :unit, :category, true, now())"),
                {"name": name, "unit": unit, "category": category},
            )

    op.alter_column("vegetables", "is_active", server_default=None)
    op.alter_column("vegetables", "created_at", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_vegetables_name", table_name="vegetables")
    op.drop_index("ix_vegetables_id", table_name="vegetables")
    op.drop_column("vegetables", "created_at")
    op.drop_column("vegetables", "is_active")
