from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.price_entry import PriceEntry
from app.models.user import User
from app.models.vegetable import Vegetable
from app.models.correction_request import PriceCorrectionRequest
from app.schemas.price_entry import PriceEntryCreate, PriceEntryResponse, PriceCorrectionCreate

router = APIRouter(prefix="/entries", tags=["Vegetable Price Entries"])


@router.post("", response_model=PriceEntryResponse, status_code=status.HTTP_201_CREATED)
def create_price_entry(
    payload: PriceEntryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create an entry with server-generated timestamp and submitter-name snapshot."""
    vegetable = db.scalar(
        select(Vegetable).where(
            Vegetable.name == payload.vegetable,
            Vegetable.is_active.is_(True),
        )
    )
    if vegetable is None:
        raise HTTPException(status_code=422, detail="Choose a vegetable currently enabled by the administrator")
    if payload.unit != vegetable.unit:
        raise HTTPException(status_code=422, detail=f"Use the configured unit: {vegetable.unit}")
    if payload.price <= 0:
        raise HTTPException(status_code=422, detail="Price must be greater than zero")

    now = datetime.now(timezone.utc)
    entry = PriceEntry(
        user_id=current_user.id,
        submitter_name=current_user.full_name or current_user.username,
        vegetable=vegetable.name,
        price=payload.price,
        unit=vegetable.unit,
        entry_date=now.astimezone(ZoneInfo("Asia/Kolkata")).date(),
        created_at=now,
        notes=(payload.notes or "").strip() or None,
    )
    db.add(entry)
    try:
        db.commit()
        db.refresh(entry)
    except Exception:
        db.rollback()
        raise
    return entry


@router.get("/mine", response_model=list[PriceEntryResponse])
def list_my_price_entries(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the authenticated user's complete saved entry history."""
    statement = (
        select(PriceEntry)
        .where(PriceEntry.user_id == current_user.id)
        .order_by(PriceEntry.created_at.desc(), PriceEntry.id.desc())
    )
    return list(db.scalars(statement).all())


@router.get("/mine/price-trends")
def get_my_price_trends(
    vegetable: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return daily average prices for one vegetable, belonging only
    to the authenticated user.

    Multiple valid entries for the same date and unit are averaged.
    Approved corrections are reflected automatically because the
    query uses the current PriceEntry records.
    """
    vegetable_name = vegetable.strip()

    if not vegetable_name:
        raise HTTPException(
            status_code=422,
            detail="A vegetable name is required",
        )

    statement = (
        select(
            PriceEntry.entry_date,
            PriceEntry.unit,
            func.avg(PriceEntry.price).label("average_price"),
            func.count(PriceEntry.id).label("submission_count"),
        )
        .where(
            PriceEntry.user_id == current_user.id,
            PriceEntry.vegetable == vegetable_name,
            PriceEntry.price > 0,
        )
        .group_by(
            PriceEntry.entry_date,
            PriceEntry.unit,
        )
        .order_by(PriceEntry.entry_date.asc())
    )

    rows = db.execute(statement).all()

    return [
        {
            "date": row.entry_date.isoformat(),
            "unit": row.unit,
            "average_price": round(float(row.average_price), 2),
            "submission_count": row.submission_count,
        }
        for row in rows
    ]

def _correction_payload(request: PriceCorrectionRequest, entry: PriceEntry) -> dict:
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


@router.post("/{entry_id}/correction-requests", status_code=status.HTTP_201_CREATED)
def create_correction_request(
    entry_id: int,
    payload: PriceCorrectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a correction request for one of the authenticated user's entries."""
    entry = db.get(PriceEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Price entry not found")
    if entry.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can request corrections only for your own entries")

    pending = db.scalar(
        select(PriceCorrectionRequest).where(
            PriceCorrectionRequest.entry_id == entry_id,
            PriceCorrectionRequest.status == "pending",
        )
    )
    if pending is not None:
        raise HTTPException(status_code=409, detail="A correction request for this entry is already pending")

    if payload.proposed_price == entry.price and (payload.proposed_notes or None) == (entry.notes or None):
        raise HTTPException(status_code=422, detail="The proposed correction is identical to the current entry")

    request = PriceCorrectionRequest(
        entry_id=entry.id,
        user_id=current_user.id,
        submitter_name=current_user.full_name or current_user.username,
        original_price=entry.price,
        original_notes=entry.notes,
        proposed_price=payload.proposed_price,
        proposed_notes=(payload.proposed_notes or "").strip() or None,
        reason=payload.reason.strip(),
        status="pending",
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return _correction_payload(request, entry)


@router.get("/correction-requests/mine")
def list_my_correction_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return correction requests created by the authenticated user."""
    rows = db.execute(
        select(PriceCorrectionRequest, PriceEntry)
        .join(PriceEntry, PriceEntry.id == PriceCorrectionRequest.entry_id)
        .where(PriceCorrectionRequest.user_id == current_user.id)
        .order_by(PriceCorrectionRequest.created_at.desc(), PriceCorrectionRequest.id.desc())
    ).all()
    return [_correction_payload(request, entry) for request, entry in rows]
