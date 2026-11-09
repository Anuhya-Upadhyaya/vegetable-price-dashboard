
import logging
from datetime import timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_current_user
from app.db.session import get_db

from app.models.customer import Customer
from app.models.customer_profile import CustomerProfile
from app.models.user import User

from app.schemas.customer import (
    CustomerProfileResponse,
    CustomerProfileUpsert,
    CustomerSubmissionCreate,
    CustomerSubmissionResponse,
)

from app.services.notifications import notify_admins, send_admin_email


logger = logging.getLogger(__name__)

router = APIRouter(tags=["Customers"])


# ============================================================
# EXISTING CUSTOMER PROFILE — KEEP FOR COMPATIBILITY
# ============================================================

@router.get(
    "/customers/me",
    response_model=CustomerProfileResponse | None,
)
def get_my_customer_profile(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.scalar(
        select(CustomerProfile).where(
            CustomerProfile.user_id == user.id
        )
    )


@router.put(
    "/customers/me",
    response_model=CustomerProfileResponse,
)
def save_my_customer_profile(
    payload: CustomerProfileUpsert,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the user's existing profile, or create it if absent."""

    profile = db.scalar(
        select(CustomerProfile).where(
            CustomerProfile.user_id == user.id
        )
    )

    if profile is None:
        profile = CustomerProfile(user_id=user.id)
        db.add(profile)

    for field, value in payload.model_dump().items():
        setattr(profile, field, value)

    try:
        db.commit()
        db.refresh(profile)

    except Exception:
        db.rollback()
        logger.exception(
            "Unable to save customer profile for user %s",
            user.id,
        )
        raise

    return profile


# ============================================================
# NEW CUSTOMER SUBMISSION — APPEND-ONLY
# ============================================================

@router.post(
    "/customers",
    response_model=CustomerSubmissionResponse,
    status_code=201,
)
def create_customer_submission(
    payload: CustomerSubmissionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a NEW customer record for every successful submission.

    This endpoint never updates or replaces an earlier Customer row.
    """

    data = payload.model_dump()

    customer = Customer(
        created_by_user_id=user.id,

        contact_name=data["contact_name"],
        organization=data["organization"],
        customer_type=data.get("customer_type") or "Retailer",

        # Use the signed-in account's phone as the primary number.
        phone=user.phone,

        # Keep the form's alternate number separately.
        alternate_phone=data.get("alternate_phone"),

        # Fall back to the registered account email if necessary.
        email=data.get("email") or user.email,

        designation=data.get("designation"),

        country=data.get("country") or "India",

        # Customer model requires these address fields.
        state=data.get("state") or "Not provided",
        city=data["city"],
        locality=data.get("locality") or "Not provided",
        street_address=data.get("street_address") or "Not provided",
        postal_code=data.get("postal_code"),

        latitude=data.get("latitude"),
        longitude=data.get("longitude"),

        vegetables=data.get("vegetables_required"),
        expected_quantity=data.get("expected_quantity"),
        purchasing_frequency=data.get("purchase_frequency"),

        delivery_instructions=data.get("delivery_instructions"),
        additional_notes=data.get("additional_requirements"),
    )

    # --------------------------------------------------------
    # 1. INSERT a new customer record.
    # --------------------------------------------------------

    try:
        db.add(customer)
        db.commit()
        db.refresh(customer)

    except Exception:
        db.rollback()
        logger.exception(
            "Unable to create customer submission for user %s",
            user.id,
        )
        raise

    customer_name = user.full_name or user.username

    title = "New customer information submitted"

    message = (
        f"{customer_name} ({user.email}) submitted new customer "
        f"information for {customer.organization}."
    )

    # --------------------------------------------------------
    # 2. Notify administrators.
    #    Notification failure must not undo the saved customer.
    # --------------------------------------------------------

    try:
        notify_admins(
            db,
            title,
            message,
            "customer",
        )
        db.commit()

    except Exception:
        db.rollback()
        logger.exception(
            "Customer record %s was saved, but notification failed",
            customer.id,
        )

    # --------------------------------------------------------
    # 3. Send administrator email.
    # --------------------------------------------------------

    email_body = f"""
{title}

Submitted by:
Account name: {customer_name}
Account email: {user.email}
Account phone: {user.phone}

Customer / Business information:
Contact name: {customer.contact_name}
Customer email: {customer.email}
Primary phone: {customer.phone}
Alternate phone: {customer.alternate_phone or "Not provided"}
Organization: {customer.organization}
Customer type: {customer.customer_type}

Location:
Country: {customer.country}
State: {customer.state}
City: {customer.city}
Locality: {customer.locality}
Street address: {customer.street_address}
Postal code: {customer.postal_code or "Not provided"}
Latitude: {customer.latitude or "Not provided"}
Longitude: {customer.longitude or "Not provided"}

Vegetables required:
{customer.vegetables or "Not provided"}

Expected quantity:
{customer.expected_quantity or "Not provided"}

Purchasing frequency:
{customer.purchasing_frequency or "Not provided"}

Delivery instructions:
{customer.delivery_instructions or "Not provided"}

Additional notes:
{customer.additional_notes or "Not provided"}

Please open the FreshFlow Admin Dashboard to view this submission.
"""

    try:
        send_admin_email(title, email_body)

    except Exception:
        logger.exception(
            "Customer record %s was saved, but admin email failed",
            customer.id,
        )

    # --------------------------------------------------------
    # 4. Return the newly inserted record.
    # --------------------------------------------------------

    return {
        **{
            column.name: getattr(customer, column.name)
            for column in Customer.__table__.columns
        },
        "user_email": user.email,
        "user_full_name": user.full_name,
    }




# ============================================================
# ADMIN — CUSTOMER SUBMISSION DIRECTORY
# ============================================================

@router.get(
    "/admin/customers",
    response_model=list[CustomerSubmissionResponse],
)
def list_customer_submissions(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Return both new customer submissions and existing customer profiles.
    Newest records appear first.
    """

    all_records = []

    # 1. Retrieve new customer submissions.
    new_customers = db.execute(
        select(Customer, User)
        .join(
            User,
            Customer.created_by_user_id == User.id,
        )
    ).all()

    for customer, user in new_customers:
        all_records.append({
            **{
                column.name: getattr(customer, column.name)
                for column in Customer.__table__.columns
            },
            "user_email": user.email,
            "user_full_name": user.full_name,
        })

    # 2. Retrieve existing customer profiles.
    existing_profiles = db.execute(
        select(CustomerProfile, User)
        .join(
            User,
            CustomerProfile.user_id == User.id,
        )
    ).all()

    for profile, user in existing_profiles:
        all_records.append({
            "id": -profile.id,
            "created_by_user_id": profile.user_id,
            "contact_name": profile.contact_name,
            "organization": profile.organization,
            "customer_type": profile.customer_type or "Retailer",
            "email": profile.email or user.email or "",
            "phone": user.phone or "",
            "alternate_phone": profile.alternate_phone,
            "designation": profile.designation,
            "country": profile.country or "India",
            "state": profile.state or "Not provided",
            "city": profile.city or "Not provided",
            "locality": profile.locality or "Not provided",
            "street_address": profile.street_address or "Not provided",
            "postal_code": profile.postal_code,
            "latitude": profile.latitude,
            "longitude": profile.longitude,
            "vegetables": profile.vegetables_required,
            "expected_quantity": profile.expected_quantity,
            "purchasing_frequency": profile.purchase_frequency,
            "delivery_instructions": profile.delivery_instructions,
            "additional_notes": profile.additional_requirements,
            "created_at": profile.created_at,
            "user_email": user.email,
            "user_full_name": user.full_name,
        })

    # 3. Sort all records by creation date, newest first.
    all_records.sort(
        key=lambda record: (
            record["created_at"].timestamp()
            if record["created_at"]
            else 0,
            record["id"],
        ),
        reverse=True,
    )

    return all_records
