"""add user registration approval and security fields

Revision ID: 359dd5f319d8
Revises: bacea2c07255
Create Date: 2026-10-05 21:01:52.917623

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "359dd5f319d8"
down_revision: Union[str, Sequence[str], None] = "bacea2c07255"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # Add new columns as nullable first so existing users can be migrated safely.
    op.add_column(
        "users",
        sa.Column("full_name", sa.String(length=150), nullable=True),
    )

    op.add_column(
        "users",
        sa.Column("phone", sa.String(length=20), nullable=True),
    )

    op.add_column(
        "users",
        sa.Column(
            "status",
            sa.String(length=30),
            nullable=False,
            server_default="pending",
        ),
    )

    op.add_column(
        "users",
        sa.Column(
            "email_verified",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )

    op.add_column(
        "users",
        sa.Column(
            "mfa_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )

    op.add_column(
        "users",
        sa.Column("mfa_secret", sa.String(length=255), nullable=True),
    )

    op.add_column(
        "users",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.add_column(
        "users",
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.add_column(
        "users",
        sa.Column("approved_by", sa.Integer(), nullable=True),
    )

    # Existing users need values for the newly required registration fields.
    op.execute(
        """
        UPDATE users
        SET full_name = username
        WHERE full_name IS NULL
        """
    )

    op.execute(
        """
        UPDATE users
        SET phone = 'PENDING-' || id
        WHERE phone IS NULL
        """
    )

    # Make the registration fields required after existing rows are populated.
    op.alter_column(
        "users",
        "full_name",
        existing_type=sa.String(length=150),
        nullable=False,
    )

    op.alter_column(
        "users",
        "phone",
        existing_type=sa.String(length=20),
        nullable=False,
    )

    # Give the constraints explicit names so downgrade works reliably.
    op.create_unique_constraint(
        "uq_users_phone",
        "users",
        ["phone"],
    )

    op.create_foreign_key(
        "fk_users_approved_by_users",
        "users",
        "users",
        ["approved_by"],
        ["id"],
    )

    # Defaults were only needed during migration.
    # Application/model defaults will handle newly created records.
    op.alter_column(
        "users",
        "status",
        server_default=None,
    )

    op.alter_column(
        "users",
        "email_verified",
        server_default=None,
    )

    op.alter_column(
        "users",
        "mfa_enabled",
        server_default=None,
    )

    op.alter_column(
        "users",
        "created_at",
        server_default=None,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_constraint(
        "fk_users_approved_by_users",
        "users",
        type_="foreignkey",
    )

    op.drop_constraint(
        "uq_users_phone",
        "users",
        type_="unique",
    )

    op.drop_column("users", "approved_by")
    op.drop_column("users", "approved_at")
    op.drop_column("users", "created_at")
    op.drop_column("users", "mfa_secret")
    op.drop_column("users", "mfa_enabled")
    op.drop_column("users", "email_verified")
    op.drop_column("users", "status")
    op.drop_column("users", "phone")
    op.drop_column("users", "full_name")