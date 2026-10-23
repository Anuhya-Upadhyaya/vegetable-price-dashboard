from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CorrectionCreate(BaseModel):
    proposed_price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    reason: str = Field(min_length=5, max_length=1000)

    @field_validator("reason")
    @classmethod
    def clean_reason(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 5:
            raise ValueError("Please explain the reason in at least 5 characters")
        return value


class CorrectionReview(BaseModel):
    review_note: str | None = Field(default=None, max_length=1000)

    @field_validator("review_note")
    @classmethod
    def clean_note(cls, value: str | None) -> str | None:
        return (value or "").strip() or None


class CorrectionResponse(BaseModel):
    id: int
    price_entry_id: int
    vegetable: str
    unit: str
    entry_date: date
    entry_created_at: datetime
    requested_by_user_id: int | None
    requester_name: str
    original_price: Decimal
    proposed_price: Decimal
    reason: str
    status: str
    created_at: datetime
    reviewer_name: str | None
    review_note: str | None
    reviewed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
