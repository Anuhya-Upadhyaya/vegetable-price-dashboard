from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PriceCorrectionRequest(Base):
    __tablename__ = "price_correction_requests"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    entry_id: Mapped[int] = mapped_column(
        ForeignKey("price_entries.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # The account may later be deleted; keep the request and submitter snapshot.
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    submitter_name: Mapped[str] = mapped_column(String(150), nullable=False)

    # Immutable snapshots of the value that was being corrected.
    original_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    original_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    proposed_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    proposed_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", index=True)
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    entry = relationship("PriceEntry")
    user = relationship("User", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
