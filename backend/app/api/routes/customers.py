
import logging
from datetime import date, datetime
from decimal import Decimal
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from openpyxl.styles import (
    Alignment,
    Border,
    Font,
    PatternFill,
    Side,
)
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_current_user
from app.db.session import get_db

from app.models.customer import Customer
from app.models.customer_profile import CustomerProfile
from app.models.customer_correction_request import CustomerCorrectionRequest
from app.models.user import User
from app.models.warehouse import Warehouse

from app.schemas.customer import (
    CustomerProfileResponse,
    CustomerProfileUpsert,
    CustomerSubmissionCreate,
    CustomerSubmissionResponse,
    CustomerCorrectionRequestCreate,
    CustomerCorrectionRequestResponse,
)

from app.services.notifications import notify_admins, send_admin_email


logger = logging.getLogger(__name__)

router = APIRouter(tags=["Customers"])


# ============================================================
# WAREHOUSE / ADDITIONAL CUSTOMER LOCATION SCHEMAS
# ============================================================

class WarehouseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    location: str = Field(min_length=1, max_length=255)

    @field_validator("name", "location")
    @classmethod
    def strip_and_validate_text(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("This field cannot be empty.")

        return value


class WarehouseResponse(BaseModel):
    id: int
    name: str
    location: str
    customer_id: int

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# SHARED HELPERS
# ============================================================

def customer_to_dict(customer):
    """Convert a Customer SQLAlchemy model into a response dictionary."""

    return {
        column.name: getattr(customer, column.name)
        for column in Customer.__table__.columns
    }


def json_safe_value(value):
    """Convert database and Python values into JSON-compatible values."""

    if value is None:
        return None

    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, (datetime, date)):
        return value.isoformat()

    if isinstance(value, dict):
        return {
            str(key): json_safe_value(item)
            for key, item in value.items()
        }

    if isinstance(value, (list, tuple)):
        return [json_safe_value(item) for item in value]

    if isinstance(value, (str, int, float, bool)):
        return value

    return value


def get_customer_submission_response(customer, user):
    """Build the customer response including submitting-user information."""

    return {
        **customer_to_dict(customer),
        "user_email": user.email,
        "user_full_name": user.full_name,
    }


def build_correction_email(correction, customer, user):
    """Build an email containing the requested customer changes."""

    original = correction.original_details or {}
    proposed = correction.proposed_details or {}

    labels = {
        "contact_name": "Customer Name",
        "organization": "Company / Shop",
        "customer_type": "Customer Type",
        "phone": "Mobile Number",
        "email": "Customer Email",
        "designation": "Designation",
        "country": "Country",
        "state": "State",
        "city": "City",
        "locality": "Locality / Area",
        "street_address": "Street Address",
        "postal_code": "Postal Code",
        "latitude": "Latitude",
        "longitude": "Longitude",
        "vegetables": "Vegetables Required",
        "expected_quantity": "Expected Quantity",
        "purchasing_frequency": "Purchase Frequency",
        "delivery_instructions": "Delivery Instructions",
        "additional_notes": "Additional Requirements",
    }

    changes = []

    for field, label in labels.items():
        old_value = original.get(field)
        new_value = proposed.get(field)

        if str(old_value or "") != str(new_value or ""):
            changes.append(
                f"{label}:\n"
                f"  Existing: {old_value or 'Not provided'}\n"
                f"  Proposed: {new_value or 'Not provided'}"
            )

    changes_text = (
        "\n\n".join(changes)
        if changes
        else "No field differences were detected."
    )

    customer_name = (
        customer.contact_name
        or original.get("contact_name")
        or "Customer"
    )

    organization = (
        customer.organization
        or original.get("organization")
        or "Not provided"
    )

    submitted_by = user.full_name or user.username or "User"

    return f"""
A customer correction request has been submitted in FreshFlow.

REQUEST DETAILS
--------------------------------------------------

Correction Request ID: {correction.id}
Customer Record ID: {customer.id}
Request Status: Pending
Submitted On: {correction.created_at}

SUBMITTED BY
--------------------------------------------------

Name: {submitted_by}
Account Email: {user.email}
Account Phone: {user.phone or "Not provided"}

CUSTOMER
--------------------------------------------------

Customer Name: {customer_name}
Company / Shop: {organization}
Customer Mobile: {customer.phone}
Customer Email: {customer.email}

REASON FOR CORRECTION
--------------------------------------------------

{correction.reason}

REQUESTED CHANGES
--------------------------------------------------

{changes_text}

--------------------------------------------------

The original customer record has NOT been changed.

Please log in to the FreshFlow Admin Dashboard, open
Customer Information, and review the Customer Correction Requests section.

You can approve or reject this request and provide Admin remarks.
"""


# ============================================================
# EXCEL HELPERS
# ============================================================

def excel_safe_value(value):
    """Convert values into Excel-compatible cells."""

    if value is None:
        return ""

    if isinstance(value, (datetime, date)):
        return value.isoformat()

    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, (dict, list, tuple)):
        return str(json_safe_value(value))

    if isinstance(value, str) and value.startswith(
        ("=", "+", "-", "@")
    ):
        return "'" + value

    return value


def is_empty_excel_value(value):
    """Check whether a value should be omitted from the Excel export."""

    if value is None:
        return True

    if isinstance(value, str) and not value.strip():
        return True

    return False


def format_excel_sheet(sheet):
    """Apply polished FreshFlow formatting to the Excel worksheet."""

    dark_green = "173C2A"
    light_green = "E8F1E9"
    border_green = "C9D8CC"
    white = "FFFFFF"
    dark_text = "24352A"

    thin_border = Border(
        bottom=Side(
            style="thin",
            color=border_green,
        )
    )

    # Worksheet settings.
    sheet.freeze_panes = "A2"
    sheet.sheet_view.showGridLines = False

    # This is a field/value report, not a conventional data table.
    sheet.auto_filter.ref = None

    # Main title row.
    for cell in sheet[1]:
        cell.fill = PatternFill(
            fill_type="solid",
            fgColor=dark_green,
        )
        cell.font = Font(
            name="Aptos",
            bold=True,
            color=white,
            size=13,
        )
        cell.alignment = Alignment(
            vertical="center",
            horizontal="left",
        )

    sheet.row_dimensions[1].height = 30

    # Format remaining rows.
    for row_index in range(2, sheet.max_row + 1):
        first_value = sheet.cell(
            row=row_index,
            column=1,
        ).value

        second_value = sheet.cell(
            row=row_index,
            column=2,
        ).value

        # Additional locations section heading.
        if first_value == "ADDITIONAL LOCATIONS":
            for cell in sheet[row_index]:
                cell.fill = PatternFill(
                    fill_type="solid",
                    fgColor=dark_green,
                )
                cell.font = Font(
                    name="Aptos",
                    bold=True,
                    color=white,
                    size=12,
                )
                cell.alignment = Alignment(
                    vertical="center",
                    horizontal="left",
                )

            sheet.row_dimensions[row_index].height = 27
            continue

        # Individual location headings.
        if (
            isinstance(first_value, str)
            and first_value.startswith("Location ")
            and second_value in (None, "")
        ):
            for cell in sheet[row_index]:
                cell.fill = PatternFill(
                    fill_type="solid",
                    fgColor=light_green,
                )
                cell.font = Font(
                    name="Aptos",
                    bold=True,
                    color=dark_green,
                    size=11,
                )
                cell.alignment = Alignment(
                    vertical="center",
                    horizontal="left",
                )

            sheet.row_dimensions[row_index].height = 24
            continue

        # Normal field/value rows.
        for cell in sheet[row_index]:
            cell.font = Font(
                name="Aptos",
                size=10,
                color=dark_text,
            )
            cell.alignment = Alignment(
                vertical="top",
                horizontal="left",
                wrap_text=True,
            )
            cell.border = thin_border

        # Highlight field names.
        label_cell = sheet.cell(
            row=row_index,
            column=1,
        )

        label_cell.font = Font(
            name="Aptos",
            bold=True,
            size=10,
            color=dark_green,
        )

        label_cell.fill = PatternFill(
            fill_type="solid",
            fgColor=light_green,
        )

        sheet.row_dimensions[row_index].height = 22

    # Column widths.
    sheet.column_dimensions["A"].width = 34
    sheet.column_dimensions["B"].width = 65

    # Increase height for long values and addresses.
    for row_index in range(2, sheet.max_row + 1):
        for cell in sheet[row_index]:
            if (
                cell.value is not None
                and len(str(cell.value)) > 90
            ):
                sheet.row_dimensions[row_index].height = 48
                break

    # Printing and page layout.
    sheet.sheet_properties.pageSetUpPr.fitToPage = True
    sheet.page_setup.fitToWidth = 1
    sheet.page_setup.fitToHeight = 0
    sheet.page_setup.orientation = "portrait"


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
    status_code=status.HTTP_201_CREATED,
)
def create_customer_submission(
    payload: CustomerSubmissionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a NEW customer record for every successful submission."""

    data = payload.model_dump()

    customer = Customer(
        created_by_user_id=user.id,
        contact_name=data["contact_name"],
        organization=data["organization"],
        customer_type=data.get("customer_type") or "Retailer",
        phone=data["phone"],
        email=data.get("email") or user.email,
        designation=data.get("designation"),
        country=data.get("country") or "India",
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

    email_body = f"""
{title}

Submitted by:
Account name: {customer_name}
Account email: {user.email}
Account phone: {user.phone or "Not provided"}

Customer / Business information:
Contact name: {customer.contact_name}
Customer email: {customer.email}
Primary mobile number: {customer.phone}
Organization: {customer.organization}
Customer type: {customer.customer_type}

Location:
Country: {customer.country}
State: {customer.state}
City: {customer.city}
Locality: {customer.locality}
Street address: {customer.street_address}
Postal code: {customer.postal_code or "Not provided"}
Latitude: {customer.latitude if customer.latitude is not None else "Not provided"}
Longitude: {customer.longitude if customer.longitude is not None else "Not provided"}

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
            "Customer record %s was saved, but Admin email failed",
            customer.id,
        )

    return get_customer_submission_response(customer, user)


# ============================================================
# USER — VIEW OWN CUSTOMER SUBMISSIONS
# ============================================================

@router.get(
    "/customers/mine",
    response_model=list[CustomerSubmissionResponse],
)
def get_my_customer_submissions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return only customer records submitted by the logged-in user."""

    records = db.execute(
        select(Customer, User)
        .join(User, Customer.created_by_user_id == User.id)
        .where(Customer.created_by_user_id == user.id)
        .order_by(Customer.created_at.desc(), Customer.id.desc())
    ).all()

    return [
        get_customer_submission_response(customer, record_user)
        for customer, record_user in records
    ]


# ============================================================
# USER — ADD AN ADDITIONAL CUSTOMER LOCATION
# ============================================================

@router.post(
    "/customers/{customer_id}/warehouses",
    response_model=WarehouseResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_customer_warehouse(
    customer_id: int,
    payload: WarehouseCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add an additional location to one of the user's customer records."""

    customer = db.scalar(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.created_by_user_id == user.id,
        )
    )

    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer record not found.",
        )

    warehouse = Warehouse(
        customer_id=customer.id,
        name=payload.name,
        location=payload.location,
    )

    try:
        db.add(warehouse)
        db.commit()
        db.refresh(warehouse)

        return warehouse

    except Exception:
        db.rollback()
        logger.exception(
            "Unable to add location for customer %s",
            customer_id,
        )
        raise


# ============================================================
# USER — VIEW OWN ADDITIONAL CUSTOMER LOCATIONS
# ============================================================

@router.get(
    "/customers/{customer_id}/warehouses",
    response_model=list[WarehouseResponse],
)
def get_customer_warehouses(
    customer_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return locations belonging to the user's own customer record."""

    customer = db.scalar(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.created_by_user_id == user.id,
        )
    )

    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer record not found.",
        )

    return db.scalars(
        select(Warehouse)
        .where(Warehouse.customer_id == customer.id)
        .order_by(Warehouse.id.asc())
    ).all()


# ============================================================
# USER — CREATE CUSTOMER CORRECTION REQUEST
# ============================================================

@router.post(
    "/customers/{customer_id}/correction-requests",
    response_model=CustomerCorrectionRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_customer_correction_request(
    customer_id: int,
    payload: CustomerCorrectionRequestCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit proposed changes without modifying the original record."""

    customer = db.scalar(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.created_by_user_id == user.id,
        )
    )

    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer record not found.",
        )

    pending_request = db.scalar(
        select(CustomerCorrectionRequest).where(
            CustomerCorrectionRequest.customer_id == customer_id,
            CustomerCorrectionRequest.user_id == user.id,
            CustomerCorrectionRequest.status == "pending",
        )
    )

    if pending_request:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "A correction request for this customer "
                "is already pending."
            ),
        )

    original_details = {
        column.name: json_safe_value(getattr(customer, column.name))
        for column in Customer.__table__.columns
        if column.name not in {
            "id",
            "created_by_user_id",
            "created_at",
        }
    }

    proposed = payload.proposed_details.model_dump()

    proposed_details = {
        "contact_name": proposed.get("contact_name"),
        "organization": proposed.get("organization"),
        "customer_type": (
            proposed.get("customer_type") or customer.customer_type
        ),
        "phone": proposed.get("phone"),
        "email": proposed.get("email") or customer.email,
        "designation": proposed.get("designation"),
        "country": proposed.get("country") or customer.country or "India",
        "state": proposed.get("state") or customer.state or "Not provided",
        "city": proposed.get("city"),
        "locality": (
            proposed.get("locality")
            or customer.locality
            or "Not provided"
        ),
        "street_address": (
            proposed.get("street_address")
            or customer.street_address
            or "Not provided"
        ),
        "postal_code": proposed.get("postal_code"),
        "latitude": proposed.get("latitude"),
        "longitude": proposed.get("longitude"),
        "vegetables": proposed.get("vegetables_required"),
        "expected_quantity": proposed.get("expected_quantity"),
        "purchasing_frequency": proposed.get("purchase_frequency"),
        "delivery_instructions": proposed.get("delivery_instructions"),
        "additional_notes": proposed.get("additional_requirements"),
    }

    original_details = json_safe_value(original_details)
    proposed_details = json_safe_value(proposed_details)

    correction = CustomerCorrectionRequest(
        customer_id=customer.id,
        user_id=user.id,
        original_details=original_details,
        proposed_details=proposed_details,
        reason=payload.reason,
        status="pending",
    )

    try:
        db.add(correction)
        db.commit()
        db.refresh(correction)

    except Exception:
        db.rollback()
        logger.exception(
            "Unable to create customer correction request for customer %s",
            customer_id,
        )
        raise

    try:
        notify_admins(
            db,
            "New customer correction request",
            (
                f"{user.full_name or user.username} submitted a correction "
                f"request for customer {customer.contact_name} "
                f"(record #{customer.id})."
            ),
            "customer_correction",
        )
        db.commit()

    except Exception:
        db.rollback()
        logger.exception(
            "Correction request %s was saved, but Admin notification failed",
            correction.id,
        )

    email_subject = (
        f"FreshFlow: Customer correction request #{correction.id}"
    )

    email_body = build_correction_email(
        correction,
        customer,
        user,
    )

    try:
        send_admin_email(email_subject, email_body)

        logger.info(
            "Admin email sent for customer correction request %s",
            correction.id,
        )

    except Exception:
        logger.exception(
            "Correction request %s was saved, but Admin email failed",
            correction.id,
        )

    return correction


# ============================================================
# USER — VIEW OWN CUSTOMER CORRECTION REQUESTS
# ============================================================

@router.get(
    "/customers/correction-requests/mine",
    response_model=list[CustomerCorrectionRequestResponse],
)
def get_my_customer_correction_requests(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return correction requests belonging to the logged-in user."""

    return db.scalars(
        select(CustomerCorrectionRequest)
        .where(CustomerCorrectionRequest.user_id == user.id)
        .order_by(
            CustomerCorrectionRequest.created_at.desc(),
            CustomerCorrectionRequest.id.desc(),
        )
    ).all()


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
    """Return customer submissions and existing customer profiles."""

    all_records = []

    new_customers = db.execute(
        select(Customer, User)
        .join(
            User,
            Customer.created_by_user_id == User.id,
        )
    ).all()

    for customer, user in new_customers:
        all_records.append(
            get_customer_submission_response(customer, user)
        )

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
            "phone": profile.phone,
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

    all_records.sort(
        key=lambda record: (
            record["created_at"].timestamp()
            if record.get("created_at")
            else 0,
            record["id"],
        ),
        reverse=True,
    )

    return all_records


# ============================================================
# ADMIN — VIEW ADDITIONAL CUSTOMER LOCATIONS
# ============================================================

@router.get(
    "/admin/customers/{customer_id}/warehouses",
    response_model=list[WarehouseResponse],
)
def admin_get_customer_warehouses(
    customer_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Allow Admin to view locations linked to a customer submission."""

    customer = db.get(Customer, customer_id)

    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer submission not found.",
        )

    return db.scalars(
        select(Warehouse)
        .where(Warehouse.customer_id == customer.id)
        .order_by(Warehouse.id.asc())
    ).all()


# ============================================================
# ADMIN — EXPORT CUSTOMER DETAILS TO EXCEL
# ============================================================

@router.get("/admin/customers/{customer_id}/export")
def admin_export_customer_excel(
    customer_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Export customer details and additional locations into one worksheet.

    Positive IDs represent Customer submissions.
    Negative IDs represent CustomerProfile records.

    Empty fields are omitted.
    No database records are modified.
    """

    if customer_id == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid customer ID.",
        )

    # --------------------------------------------------------
    # GET CUSTOMER DETAILS AND ADDITIONAL LOCATIONS
    # --------------------------------------------------------

    if customer_id > 0:
        customer = db.get(Customer, customer_id)

        if customer is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer submission not found.",
            )

        submitting_user = db.get(User, customer.created_by_user_id)

        customer_details = customer_to_dict(customer)

        customer_details["user_email"] = (
            submitting_user.email if submitting_user else None
        )

        customer_details["user_full_name"] = (
            submitting_user.full_name if submitting_user else None
        )

        warehouses = db.scalars(
            select(Warehouse)
            .where(Warehouse.customer_id == customer.id)
            .order_by(Warehouse.id.asc())
        ).all()

    else:
        profile = db.get(CustomerProfile, abs(customer_id))

        if profile is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer profile not found.",
            )

        profile_user = db.get(User, profile.user_id)

        customer_details = {
            "id": -profile.id,
            "created_by_user_id": profile.user_id,
            "contact_name": profile.contact_name,
            "organization": profile.organization,
            "customer_type": profile.customer_type,
            "email": (
                profile.email
                or (profile_user.email if profile_user else None)
            ),
            "phone": profile.phone,
            "designation": profile.designation,
            "country": profile.country,
            "state": profile.state,
            "city": profile.city,
            "locality": profile.locality,
            "street_address": profile.street_address,
            "postal_code": profile.postal_code,
            "latitude": profile.latitude,
            "longitude": profile.longitude,
            "vegetables": profile.vegetables_required,
            "expected_quantity": profile.expected_quantity,
            "purchasing_frequency": profile.purchase_frequency,
            "delivery_instructions": profile.delivery_instructions,
            "additional_notes": profile.additional_requirements,
            "created_at": profile.created_at,
            "user_email": (
                profile_user.email if profile_user else None
            ),
            "user_full_name": (
                profile_user.full_name if profile_user else None
            ),
        }

        # CustomerProfile records have no warehouse association.
        warehouses = []

    # --------------------------------------------------------
    # CREATE ONE WORKSHEET
    # --------------------------------------------------------

    workbook = Workbook()

    sheet = workbook.active
    sheet.title = "Customer Information"

    # Main title row.
    sheet.append(["CUSTOMER INFORMATION", ""])

    # Customer details.
    for field, value in customer_details.items():
        if is_empty_excel_value(value):
            continue

        sheet.append([
            excel_safe_value(field.replace("_", " ").title()),
            excel_safe_value(value),
        ])

    # --------------------------------------------------------
    # ADDITIONAL LOCATIONS IN THE SAME WORKSHEET
    # --------------------------------------------------------

    if warehouses:
        sheet.append(["ADDITIONAL LOCATIONS", ""])

        for index, warehouse in enumerate(warehouses, start=1):
            sheet.append([f"Location {index}", ""])

            location_details = {
                "Location ID": warehouse.id,
                "Customer ID": warehouse.customer_id,
                "Warehouse / Location Name": warehouse.name,
                "Location Address": warehouse.location,
            }

            for field, value in location_details.items():
                if is_empty_excel_value(value):
                    continue

                sheet.append([
                    excel_safe_value(field),
                    excel_safe_value(value),
                ])

    # --------------------------------------------------------
    # FORMAT AND DOWNLOAD
    # --------------------------------------------------------

    format_excel_sheet(sheet)

    output = BytesIO()
    workbook.save(output)
    output.seek(0)

    filename = f"FreshFlow_Customer_{customer_id}.xlsx"

    return StreamingResponse(
        output,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )
