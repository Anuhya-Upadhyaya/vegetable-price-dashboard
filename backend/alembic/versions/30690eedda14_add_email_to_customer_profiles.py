"""add email to customer profiles"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "30690eedda14"
down_revision: Union[str, Sequence[str], None] = "f31c9a8d2e70"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "customer_profiles",
        sa.Column("email", sa.String(length=254), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("customer_profiles", "email")