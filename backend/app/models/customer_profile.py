from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CustomerProfile(Base):
    __tablename__ = "customer_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    contact_name: Mapped[str] = mapped_column(String(150), nullable=False)
    organization: Mapped[str] = mapped_column(String(180), nullable=False)
    customer_type: Mapped[str] = mapped_column(String(60), nullable=False, default="Retailer")
    designation: Mapped[str | None] = mapped_column(String(100))
    phone: Mapped[str] = mapped_column(String(20),nullable=False)
    email: Mapped[str | None] = mapped_column(String(254), nullable=True)
    contact_method: Mapped[str | None] = mapped_column(String(30))
    country: Mapped[str] = mapped_column(String(80), nullable=False, default="India")
    state: Mapped[str | None] = mapped_column(String(100))
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    locality: Mapped[str | None] = mapped_column(String(150))
    street_address: Mapped[str | None] = mapped_column(Text)
    postal_code: Mapped[str | None] = mapped_column(String(15))
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 7))
    longitude: Mapped[float | None] = mapped_column(Numeric(10, 7))
    delivery_instructions: Mapped[str | None] = mapped_column(Text)
    business_type: Mapped[str | None] = mapped_column(String(100))
    vegetables_required: Mapped[str | None] = mapped_column(Text)
    expected_quantity: Mapped[str | None] = mapped_column(String(100))
    purchase_frequency: Mapped[str | None] = mapped_column(String(60))
    preferred_delivery_time: Mapped[str | None] = mapped_column(String(100))
    payment_terms: Mapped[str | None] = mapped_column(String(100))
    gstin: Mapped[str | None] = mapped_column(String(20))
    additional_requirements: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User")
