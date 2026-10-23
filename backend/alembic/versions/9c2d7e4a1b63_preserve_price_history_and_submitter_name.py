"""preserve price history and snapshot submitter names

Revision ID: 9c2d7e4a1b63
Revises: 7ab4d91c2e30
Create Date: 2026-10-13
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "9c2d7e4a1b63"
down_revision: Union[str, Sequence[str], None] = "7ab4d91c2e30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add nullable first so existing records can be backfilled safely.
    op.add_column("price_entries", sa.Column("submitter_name", sa.String(length=150), nullable=True))
    connection = op.get_bind()
    connection.execute(sa.text("""
        UPDATE price_entries AS pe
        SET submitter_name = COALESCE(NULLIF(BTRIM(u.full_name), ''), u.username)
        FROM users AS u
        WHERE pe.user_id = u.id AND pe.submitter_name IS NULL
    """))
    connection.execute(sa.text("UPDATE price_entries SET submitter_name = 'Unknown user' WHERE submitter_name IS NULL"))
    op.alter_column("price_entries", "submitter_name", existing_type=sa.String(length=150), nullable=False)

    # Preserve the entry when its user is removed; the name snapshot remains.
    op.drop_constraint("price_entries_user_id_fkey", "price_entries", type_="foreignkey")
    op.alter_column("price_entries", "user_id", existing_type=sa.Integer(), nullable=True)
    op.create_foreign_key(
        "fk_price_entries_user_id_users",
        "price_entries",
        "users",
        ["user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    # Downgrade cannot safely restore deleted-user links, so it is intentionally
    # blocked if any historical row no longer has a user_id.
    connection = op.get_bind()
    orphan_count = connection.scalar(sa.text("SELECT COUNT(*) FROM price_entries WHERE user_id IS NULL"))
    if orphan_count:
        raise RuntimeError("Cannot downgrade: price entries exist without a linked user; this would risk losing history.")
    op.drop_constraint("fk_price_entries_user_id_users", "price_entries", type_="foreignkey")
    op.alter_column("price_entries", "user_id", existing_type=sa.Integer(), nullable=False)
    op.create_foreign_key("price_entries_user_id_fkey", "price_entries", "users", ["user_id"], ["id"], ondelete="CASCADE")
    op.drop_column("price_entries", "submitter_name")
