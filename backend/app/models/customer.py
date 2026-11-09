
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    created_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    contact_name: Mapped[str] = mapped_column(String(150), nullable=False)
    organization: Mapped[str] = mapped_column(String(200), nullable=False)
    customer_type: Mapped[str] = mapped_column(String(80), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)

    designation: Mapped[str | None] = mapped_column(String(120))

    country: Mapped[str] = mapped_column(
        String(80),
        nullable=False,
        server_default="India",
    )

    state: Mapped[str] = mapped_column(String(100), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    locality: Mapped[str] = mapped_column(String(150), nullable=False)
    street_address: Mapped[str] = mapped_column(String(300), nullable=False)
    postal_code: Mapped[str | None] = mapped_column(String(20))

    latitude: Mapped[float | None] = mapped_column(Numeric(10, 7))
    longitude: Mapped[float | None] = mapped_column(Numeric(10, 7))

    vegetables: Mapped[str | None] = mapped_column(Text)
    expected_quantity: Mapped[str | None] = mapped_column(String(100))
    purchasing_frequency: Mapped[str | None] = mapped_column(String(100))
    delivery_instructions: Mapped[str | None] = mapped_column(Text)
    additional_notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
