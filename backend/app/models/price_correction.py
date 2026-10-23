from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PriceCorrectionRequest(Base):
    """A user's request to correct the price on one of their own entries.

    The original entry is never edited by the user. An administrator reviews
    the request; only an approval changes PriceEntry.price. The original value
    is snapshotted here so the full correction history is always available.
    """

    __tablename__ = "price_correction_requests"
    __table_args__ = (
        CheckConstraint("status IN ('pending','approved','rejected')", name="ck_price_correction_status"),
        # At most one pending request per entry.
        Index(
            "uq_price_correction_one_pending_per_entry",
            "price_entry_id",
            unique=True,
            postgresql_where=text("status = 'pending'"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    price_entry_id: Mapped[int] = mapped_column(
        ForeignKey("price_entries.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Accounts can be deleted later; names are snapshotted so history survives.
    requested_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    requester_name: Mapped[str] = mapped_column(String(150), nullable=False)

    # Snapshot of the entry's price when the request was made.
    original_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    proposed_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)

    # pending | approved | rejected
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", server_default="pending", index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    reviewed_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewer_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    price_entry = relationship("PriceEntry", foreign_keys=[price_entry_id])
