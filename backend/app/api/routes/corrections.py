from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_current_user
from app.db.session import get_db
from app.models.price_correction import PriceCorrectionRequest
from app.models.price_entry import PriceEntry
from app.models.user import User
from app.schemas.price_correction import CorrectionCreate, CorrectionResponse, CorrectionReview

router = APIRouter(tags=["Price Corrections"])

VALID_STATUSES = {"pending", "approved", "rejected"}


def _to_response(req: PriceCorrectionRequest, entry: PriceEntry) -> dict:
    return {
        "id": req.id,
        "price_entry_id": req.price_entry_id,
        "vegetable": entry.vegetable,
        "unit": entry.unit,
        "entry_date": entry.entry_date,
        "entry_created_at": entry.created_at,
        "requested_by_user_id": req.requested_by_user_id,
        "requester_name": req.requester_name,
        "original_price": req.original_price,
        "proposed_price": req.proposed_price,
        "reason": req.reason,
        "status": req.status,
        "created_at": req.created_at,
        "reviewer_name": req.reviewer_name,
        "review_note": req.review_note,
        "reviewed_at": req.reviewed_at,
    }


def _load_for_review(db: Session, correction_id: int) -> tuple[PriceCorrectionRequest, PriceEntry]:
    """Lock the request and its entry so two admins cannot decide it twice."""
    req = db.scalar(
        select(PriceCorrectionRequest)
        .where(PriceCorrectionRequest.id == correction_id)
        .with_for_update()
    )
    if req is None:
        raise HTTPException(status_code=404, detail="Correction request not found")
    entry = db.scalar(
        select(PriceEntry).where(PriceEntry.id == req.price_entry_id).with_for_update()
    )
    if entry is None:
        raise HTTPException(status_code=404, detail="The price entry no longer exists")
    if req.status != "pending":
        raise HTTPException(
            status_code=409, detail=f"This request was already {req.status}"
        )
    return req, entry


# ------------------------------------------------------------------ user side

@router.post(
    "/entries/{entry_id}/corrections",
    response_model=CorrectionResponse,
    status_code=status.HTTP_201_CREATED,
)
def request_correction(
    entry_id: int,
    payload: CorrectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Ask an administrator to correct the price of one of your own entries."""
    entry = db.get(PriceEntry, entry_id)
    # Same message for "missing" and "someone else's" so entry ids can't be probed.
    if entry is None or entry.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Price entry not found")
    if payload.proposed_price == entry.price:
        raise HTTPException(
            status_code=422, detail="The proposed price is the same as the current price"
        )

    pending = db.scalar(
        select(PriceCorrectionRequest.id).where(
            PriceCorrectionRequest.price_entry_id == entry.id,
            PriceCorrectionRequest.status == "pending",
        )
    )
    if pending is not None:
        raise HTTPException(
            status_code=409, detail="This entry already has a pending correction request"
        )

    req = PriceCorrectionRequest(
        price_entry_id=entry.id,
        requested_by_user_id=current_user.id,
        requester_name=current_user.full_name or current_user.username,
        original_price=entry.price,
        proposed_price=payload.proposed_price,
        reason=payload.reason,
        status="pending",
        created_at=datetime.now(timezone.utc),
    )
    db.add(req)
    try:
        db.commit()
    except IntegrityError:
        # Lost a race against a duplicate submit; the DB unique index caught it.
        db.rollback()
        raise HTTPException(
            status_code=409, detail="This entry already has a pending correction request"
        )
    db.refresh(req)
    return _to_response(req, entry)


@router.get("/corrections/mine", response_model=list[CorrectionResponse])
def list_my_corrections(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    rows = db.execute(
        select(PriceCorrectionRequest, PriceEntry)
        .join(PriceEntry, PriceEntry.id == PriceCorrectionRequest.price_entry_id)
        .where(PriceCorrectionRequest.requested_by_user_id == current_user.id)
        .order_by(PriceCorrectionRequest.created_at.desc(), PriceCorrectionRequest.id.desc())
    ).all()
    return [_to_response(req, entry) for req, entry in rows]


# ----------------------------------------------------------------- admin side

@router.get("/admin/corrections", response_model=list[CorrectionResponse])
def list_corrections(
    status_filter: str | None = Query(default=None, alias="status"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if status_filter is not None and status_filter not in VALID_STATUSES:
        raise HTTPException(status_code=422, detail="status must be pending, approved or rejected")
    stmt = (
        select(PriceCorrectionRequest, PriceEntry)
        .join(PriceEntry, PriceEntry.id == PriceCorrectionRequest.price_entry_id)
        .order_by(PriceCorrectionRequest.created_at.desc(), PriceCorrectionRequest.id.desc())
    )
    if status_filter:
        stmt = stmt.where(PriceCorrectionRequest.status == status_filter)
    return [_to_response(req, entry) for req, entry in db.execute(stmt).all()]


@router.post("/admin/corrections/{correction_id}/approve", response_model=CorrectionResponse)
def approve_correction(
    correction_id: int,
    payload: CorrectionReview | None = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Apply the proposed price to the entry. The original stays on the request."""
    req, entry = _load_for_review(db, correction_id)
    now = datetime.now(timezone.utc)
    entry.price = req.proposed_price
    entry.corrected_at = now
    req.status = "approved"
    req.reviewed_by_user_id = admin.id
    req.reviewer_name = admin.full_name or admin.username
    req.review_note = payload.review_note if payload else None
    req.reviewed_at = now
    db.commit()  # entry update and request decision succeed or fail together
    db.refresh(req)
    db.refresh(entry)
    return _to_response(req, entry)


@router.post("/admin/corrections/{correction_id}/reject", response_model=CorrectionResponse)
def reject_correction(
    correction_id: int,
    payload: CorrectionReview,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if not payload.review_note or len(payload.review_note) < 3:
        raise HTTPException(status_code=422, detail="Please give a reason for rejecting this request")
    req, entry = _load_for_review(db, correction_id)
    req.status = "rejected"
    req.reviewed_by_user_id = admin.id
    req.reviewer_name = admin.full_name or admin.username
    req.review_note = payload.review_note
    req.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(req)
    return _to_response(req, entry)
