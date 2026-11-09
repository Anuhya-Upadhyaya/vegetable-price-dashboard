"""add customer profiles and persistent notifications

Revision ID: f31c9a8d2e70
Revises: d2e6a8b14c90
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f31c9a8d2e70"
down_revision: Union[str, Sequence[str], None] = "d2e6a8b14c90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "customer_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("contact_name", sa.String(150), nullable=False),
        sa.Column("organization", sa.String(180), nullable=False),
        sa.Column("customer_type", sa.String(60), nullable=False, server_default="Retailer"),
        sa.Column("designation", sa.String(100)),
        sa.Column("alternate_phone", sa.String(20)),
        sa.Column("contact_method", sa.String(30)),
        sa.Column("country", sa.String(80), nullable=False, server_default="India"),
        sa.Column("state", sa.String(100)),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("locality", sa.String(150)),
        sa.Column("street_address", sa.Text()),
        sa.Column("postal_code", sa.String(15)),
        sa.Column("latitude", sa.Numeric(10, 7)),
        sa.Column("longitude", sa.Numeric(10, 7)),
        sa.Column("delivery_instructions", sa.Text()),
        sa.Column("business_type", sa.String(100)),
        sa.Column("vegetables_required", sa.Text()),
        sa.Column("expected_quantity", sa.String(100)),
        sa.Column("purchase_frequency", sa.String(60)),
        sa.Column("preferred_delivery_time", sa.String(100)),
        sa.Column("payment_terms", sa.String(100)),
        sa.Column("gstin", sa.String(20)),
        sa.Column("additional_requirements", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_customer_profiles_user_id", "customer_profiles", ["user_id"])
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("recipient_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(180), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("kind", sa.String(40), nullable=False, server_default="general"),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_notifications_recipient_user_id", "notifications", ["recipient_user_id"])


def downgrade() -> None:
    op.drop_index("ix_notifications_recipient_user_id", table_name="notifications")
    op.drop_table("notifications")
    op.drop_index("ix_customer_profiles_user_id", table_name="customer_profiles")
    op.drop_table("customer_profiles")
