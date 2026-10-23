from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator


ALLOWED_UNITS = {"kg", "piece"}


class PriceEntryCreate(BaseModel):
    vegetable: str = Field(min_length=1, max_length=100)
    price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    unit: str = Field(default="kg", min_length=1, max_length=20)
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("unit")
    @classmethod
    def validate_unit(cls, value: str) -> str:
        if value not in ALLOWED_UNITS:
            raise ValueError("Unit must be kg or piece")
        return value


class PriceEntryResponse(BaseModel):
    id: int
    user_id: int | None
    submitter_name: str
    vegetable: str
    price: Decimal
    unit: str
    entry_date: date
    notes: str | None
    created_at: datetime
    last_updated_at: datetime | None = None
    is_updated: bool = False

    model_config = ConfigDict(from_attributes=True)


class EntrySummaryResponse(BaseModel):
    total_entries: int


class VegetableCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    category: str | None = Field(default=None, max_length=100)
    unit: str = Field(default="kg", min_length=1, max_length=20)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if not value:
            raise ValueError("Vegetable name is required")
        return value

    @field_validator("unit")
    @classmethod
    def validate_unit(cls, value: str) -> str:
        if value not in ALLOWED_UNITS:
            raise ValueError("Unit must be kg or piece")
        return value


class VegetableResponse(BaseModel):
    id: int
    name: str
    category: str | None
    unit: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PriceCorrectionCreate(BaseModel):
    proposed_price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    proposed_notes: str | None = Field(default=None, max_length=2000)
    reason: str = Field(min_length=5, max_length=2000)

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 5:
            raise ValueError("Please provide a reason of at least 5 characters")
        return value


class PriceCorrectionDecision(BaseModel):
    decision: str = Field(pattern="^(approved|rejected)$")
    admin_note: str | None = Field(default=None, max_length=2000)


class PriceCorrectionResponse(BaseModel):
    id: int
    entry_id: int
    user_id: int | None
    submitter_name: str
    vegetable: str
    unit: str
    original_price: Decimal
    original_notes: str | None
    proposed_price: Decimal
    proposed_notes: str | None
    reason: str
    status: str
    admin_note: str | None
    reviewed_by: int | None
    reviewed_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
