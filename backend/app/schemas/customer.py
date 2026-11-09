
from datetime import datetime
from decimal import Decimal
import re

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)


# ============================================================
# CUSTOMER PROFILE — EXISTING PROFILE FUNCTIONALITY
# ============================================================

class CustomerProfileUpsert(BaseModel):
    # Required customer details
    contact_name: str = Field(min_length=2, max_length=150)
    organization: str = Field(min_length=2, max_length=180)
    alternate_phone: str = Field(min_length=7, max_length=20)
    email: str | None = Field(default=None, max_length=254)

    # Location details
    country: str = Field(
        default="India",
        min_length=2,
        max_length=80,
    )
    state: str | None = Field(default=None, max_length=100)
    city: str = Field(min_length=2, max_length=100)
    locality: str | None = Field(default=None, max_length=150)
    street_address: str | None = None
    postal_code: str | None = Field(default=None, max_length=15)

    # GPS coordinates
    latitude: Decimal | None = Field(
        default=None,
        ge=-90,
        le=90,
    )
    longitude: Decimal | None = Field(
        default=None,
        ge=-180,
        le=180,
    )

    # Additional customer information
    customer_type: str = Field(
        default="Retailer",
        max_length=60,
    )
    designation: str | None = Field(
        default=None,
        max_length=100,
    )
    contact_method: str | None = Field(
        default=None,
        max_length=30,
    )

    delivery_instructions: str | None = None
    business_type: str | None = Field(
        default=None,
        max_length=100,
    )
    vegetables_required: str | None = None

    expected_quantity: str | None = Field(
        default=None,
        max_length=100,
    )

    purchase_frequency: str | None = Field(
        default=None,
        max_length=60,
    )

    preferred_delivery_time: str | None = Field(
        default=None,
        max_length=100,
    )

    payment_terms: str | None = Field(
        default=None,
        max_length=100,
    )

    gstin: str | None = Field(
        default=None,
        max_length=20,
    )

    additional_requirements: str | None = None

    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    @field_validator(
        "contact_name",
        "organization",
        "alternate_phone",
        "city",
    )
    @classmethod
    def trim_required(cls, value: str) -> str:
        value = " ".join(value.split())

        if not value:
            raise ValueError("This field is required")

        return value

    @field_validator("email")
    @classmethod
    def validate_customer_email(
        cls,
        value: str | None,
    ) -> str | None:

        if value is None:
            return None

        value = value.strip().lower()

        if not value:
            return None

        email_pattern = (
            r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+"
            r"@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$"
        )

        if not re.match(email_pattern, value):
            raise ValueError(
                "Please enter a valid customer email address"
            )

        return value


# ============================================================
# CUSTOMER PROFILE RESPONSE — EXISTING FUNCTIONALITY
# ============================================================

class CustomerProfileResponse(CustomerProfileUpsert):
    id: int
    user_id: int

    # Associated user account information
    user_email: str | None = None
    user_full_name: str | None = None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# NEW CUSTOMER SUBMISSION — CREATE A SEPARATE RECORD
# ============================================================

class CustomerSubmissionCreate(CustomerProfileUpsert):
    """
    Validated data for a new customer submission.

    Every successful POST request creates a separate
    Customer record in the customers database table.

    It does not overwrite an existing customer submission.
    """

    pass


# ============================================================
# CUSTOMER SUBMISSION RESPONSE
# ============================================================

class CustomerSubmissionResponse(BaseModel):
    id: int
    created_by_user_id: int

    # Customer details
    contact_name: str
    organization: str
    customer_type: str
    email: str
    phone: str

    alternate_phone: str | None = None
    designation: str | None = None

    # Location details
    country: str
    state: str
    city: str
    locality: str
    street_address: str
    postal_code: str | None = None

    # GPS coordinates
    latitude: Decimal | None = None
    longitude: Decimal | None = None

    # Business requirements
    vegetables: str | None = None
    expected_quantity: str | None = None
    purchasing_frequency: str | None = None
    delivery_instructions: str | None = None
    additional_notes: str | None = None

    # Submission timestamp
    created_at: datetime

    # Associated account information
    user_email: str | None = None
    user_full_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# NOTIFICATION RESPONSE — EXISTING FUNCTIONALITY
# ============================================================

class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    kind: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
