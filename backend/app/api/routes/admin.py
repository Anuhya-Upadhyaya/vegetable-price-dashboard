from datetime import date,datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models.user import User
from app.models.price_entry import PriceEntry
from app.models.correction_request import PriceCorrectionRequest
from app.schemas.price_entry import PriceEntryResponse, PriceCorrectionDecision
from app.schemas.auth import AdminUserResponse
from app.services.auth import approve_user, delete_user, get_all_users


router = APIRouter(prefix="/admin", tags=["Administration"])


@router.get("/users", response_model=list[AdminUserResponse])
def list_users(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return all registered users to an authenticated administrator."""
    users = get_all_users(db)
    return [
        {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role.name if user.role else None,
            "status": user.status,
            "email_verified": user.email_verified,
            "mfa_enabled": user.mfa_enabled,
            "created_at": user.created_at,
            "approved_at": user.approved_at,
            "approved_by": user.approved_by,
        }
        for user in users
    ]


@router.post("/users/{user_id}/approve")
def approve_registered_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Approve a registered user."""
    try:
        user = approve_user(db=db, user_id=user_id, admin_user_id=current_admin.id)
    except ValueError as exc:
        message = str(exc)
        code = status.HTTP_404_NOT_FOUND if message.lower() == "user not found" else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=code, detail=message) from exc
    return {
        "message": "User approved successfully",
        "user_id": user.id,
        "username": user.username,
        "status": user.status,
        "approved_at": user.approved_at,
        "approved_by": user.approved_by,
    }


@router.delete("/users/{user_id}")
def remove_registered_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Remove an account while preserving the user's historical price entries."""
    try:
        deleted_user = delete_user(db=db, user_id=user_id, admin_user_id=current_admin.id)
    except ValueError as exc:
        message = str(exc)
        code = status.HTTP_404_NOT_FOUND if message.lower() == "user not found" else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=code, detail=message) from exc
    return {"message": "User removed successfully; historical price entries were retained", "user_id": deleted_user.id}


@router.get("/entries/summary")
def get_entry_summary(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return the real number of saved price entries, including historical entries."""
    total = db.scalar(select(func.count(PriceEntry.id))) or 0
    return {"total_entries": total}


@router.get("/entries", response_model=list[PriceEntryResponse])
def list_all_entries(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return all price entries, including entries whose submitter account was removed."""
    statement = select(PriceEntry).order_by(PriceEntry.created_at.desc(), PriceEntry.id.desc())
    return list(db.scalars(statement).all())


@router.get("/analytics")
def get_price_analytics(
    start_date: date | None = None,
    end_date: date | None = None,
    vegetable: str | None = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return filtered price analytics for the administrator."""

    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=422,
            detail="Start date cannot be after end date",
        )

    conditions = []

    if start_date:
        conditions.append(PriceEntry.entry_date >= start_date)

    if end_date:
        conditions.append(PriceEntry.entry_date <= end_date)

    if vegetable and vegetable.strip():
        conditions.append(
            func.lower(PriceEntry.vegetable)
            == vegetable.strip().lower()
        )

    statement = (
        select(PriceEntry)
        .where(and_(*conditions))
        .order_by(
            PriceEntry.entry_date.asc(),
            PriceEntry.created_at.asc(),
        )
    )

    entries = list(db.scalars(statement).all())
    prices = [float(entry.price) for entry in entries]

    summary = {
        "total_entries": len(entries),
        "average_price": round(sum(prices) / len(prices), 2)
        if prices else 0,
        "minimum_price": round(min(prices), 2) if prices else 0,
        "maximum_price": round(max(prices), 2) if prices else 0,
    }

    grouped = {}

    for entry in entries:
        key = (entry.vegetable, entry.unit)

        if key not in grouped:
            grouped[key] = []

        grouped[key].append({
            "date": entry.entry_date.isoformat(),
            "price": float(entry.price),
            "created_at": entry.created_at.isoformat(),
        })

    comparisons = []

    for (name, unit), observations in sorted(grouped.items()):
        values = [item["price"] for item in observations]

        comparisons.append({
            "vegetable": name,
            "unit": unit,
            "entry_count": len(values),
            "average_price": round(sum(values) / len(values), 2),
            "minimum_price": round(min(values), 2),
            "maximum_price": round(max(values), 2),
            "observations": observations,
        })

    return {
        "summary": summary,
        "comparisons": comparisons,
        "entries": [
            {
                "id": entry.id,
                "vegetable": entry.vegetable,
                "price": float(entry.price),
                "unit": entry.unit,
                "entry_date": entry.entry_date.isoformat(),
                "created_at": entry.created_at.isoformat(),
                "submitter_name": entry.submitter_name,
                "notes": entry.notes,
            }
            for entry in entries
        ],
    }

@router.get("/users/{user_id}/entries", response_model=list[PriceEntryResponse])
def get_user_entries(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Return entries currently associated with one user account."""
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    statement = select(PriceEntry).where(PriceEntry.user_id == user_id).order_by(PriceEntry.entry_date.desc(), PriceEntry.created_at.desc())
    return list(db.scalars(statement).all())


def _admin_correction_payload(request: PriceCorrectionRequest, entry: PriceEntry) -> dict:
    return {
        "id": request.id,
        "entry_id": request.entry_id,
        "user_id": request.user_id,
        "submitter_name": request.submitter_name,
        "vegetable": entry.vegetable,
        "unit": entry.unit,
        "original_price": request.original_price,
        "original_notes": request.original_notes,
        "proposed_price": request.proposed_price,
        "proposed_notes": request.proposed_notes,
        "reason": request.reason,
        "status": request.status,
        "admin_note": request.admin_note,
        "reviewed_by": request.reviewed_by,
        "reviewed_at": request.reviewed_at,
        "created_at": request.created_at,
    }


@router.get("/correction-requests")
def list_correction_requests(
    request_status: str | None = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List correction requests for administrator review."""
    if request_status is not None and request_status not in {"pending", "approved", "rejected"}:
        raise HTTPException(status_code=422, detail="Status must be pending, approved, or rejected")
    statement = (
        select(PriceCorrectionRequest, PriceEntry)
        .join(PriceEntry, PriceEntry.id == PriceCorrectionRequest.entry_id)
        .order_by(PriceCorrectionRequest.created_at.desc(), PriceCorrectionRequest.id.desc())
    )
    if request_status:
        statement = statement.where(PriceCorrectionRequest.status == request_status)
    rows = db.execute(statement).all()
    return [_admin_correction_payload(request, entry) for request, entry in rows]


@router.patch("/correction-requests/{request_id}/decision")
def decide_correction_request(
    request_id: int,
    payload: PriceCorrectionDecision,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Approve or reject a pending correction; approval applies the proposed value."""
    correction = db.get(PriceCorrectionRequest, request_id)
    if correction is None:
        raise HTTPException(status_code=404, detail="Correction request not found")
    if correction.status != "pending":
        raise HTTPException(status_code=409, detail="This correction request has already been reviewed")

    entry = db.get(PriceEntry, correction.entry_id)
    if entry is None:
        raise HTTPException(status_code=409, detail="The original price entry no longer exists")

    if payload.decision == "approved":
        # Apply the requested value only after admin approval.
        entry.price = correction.proposed_price
        entry.notes = correction.proposed_notes
        entry.last_updated_at = datetime.now(timezone.utc)
        entry.is_updated = True

    correction.status = payload.decision
    correction.admin_note = (payload.admin_note or "").strip() or None
    correction.reviewed_by = current_admin.id
    correction.reviewed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(correction)
    db.refresh(entry)
    return {
        "message": f"Correction request {payload.decision}",
        "request": _admin_correction_payload(correction, entry),
        "entry": {
            "id": entry.id,
            "vegetable": entry.vegetable,
            "price": entry.price,
            "unit": entry.unit,
            "notes": entry.notes,
            "created_at": entry.created_at,
            "last_updated_at": entry.last_updated_at,
            "is_updated": entry.is_updated,
        },
    }
