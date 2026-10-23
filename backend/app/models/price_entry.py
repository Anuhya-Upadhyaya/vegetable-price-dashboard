from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    false,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PriceEntry(Base):
    __tablename__ = "price_entries"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    # The account may be removed later, but the historical entry is retained.
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Snapshot of the submitter's name at the time the entry was created.
    # This remains available if the user's account is renamed or deleted.
    submitter_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    vegetable: Mapped[str] = mapped_column(
        String(80),
        nullable=False,
        index=True,
    )

    price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    unit: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="kg",
    )

    entry_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # Original submission timestamp; do not change this when correcting a price.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Timestamp of the most recent approved correction.
    # Remains NULL until an administrator approves a correction.
    last_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )

    # False for a newly submitted entry; True after an approved correction.
    # The Python and database defaults cover ORM and direct SQL inserts.
    is_updated: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=false(),
    )

    user: Mapped["User | None"] = relationship()