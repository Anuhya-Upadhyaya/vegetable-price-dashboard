
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_current_user
from app.db.session import get_db
from app.models.price_entry import PriceEntry
from app.models.user import User
from app.models.vegetable import Vegetable
from app.schemas.price_entry import VegetableCreate, VegetableResponse

router = APIRouter(tags=["Vegetables"])


@router.get("/vegetables", response_model=list[VegetableResponse])
def list_active_vegetables(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    statement = (
        select(Vegetable)
        .where(Vegetable.is_active.is_(True))
        .order_by(Vegetable.name)
    )
    return list(db.scalars(statement).all())


@router.get("/admin/vegetables", response_model=list[VegetableResponse])
def list_all_vegetables(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    statement = select(Vegetable).order_by(Vegetable.name)
    return list(db.scalars(statement).all())


@router.post(
    "/admin/vegetables",
    response_model=VegetableResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_vegetable(
    payload: VegetableCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    existing = db.scalar(
        select(Vegetable).where(
            func.lower(Vegetable.name) == payload.name.lower()
        )
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A vegetable with this name already exists",
        )

    vegetable = Vegetable(
        name=payload.name,
        category=(payload.category or "").strip() or None,
        unit=payload.unit,
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )

    db.add(vegetable)

    try:
        db.commit()
        db.refresh(vegetable)
    except Exception:
        db.rollback()
        raise

    return vegetable


@router.patch(
    "/admin/vegetables/{vegetable_id}/status",
    response_model=VegetableResponse,
)
def set_vegetable_status(
    vegetable_id: int,
    is_active: bool,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    vegetable = db.get(Vegetable, vegetable_id)

    if vegetable is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vegetable not found",
        )

    vegetable.is_active = is_active
    db.commit()
    db.refresh(vegetable)

    return vegetable


@router.get("/admin/vegetables/{vegetable_id}/trends")
def get_vegetable_trends(
    vegetable_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    vegetable = db.get(Vegetable, vegetable_id)

    if vegetable is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vegetable not found",
        )

    # Fetch the entries in chronological order so that each price
    # can be compared with the preceding price for the same unit.
    statement = (
        select(
            PriceEntry.id,
            PriceEntry.created_at,
            PriceEntry.price,
            PriceEntry.unit,
            PriceEntry.user_id,
            PriceEntry.submitter_name,
        )
        .where(PriceEntry.vegetable == vegetable.name)
        .order_by(
            PriceEntry.created_at.asc(),
            PriceEntry.id.asc(),
        )
    )

    rows = db.execute(statement).all()

    previous_price_by_unit = {}
    points = []

    for row in rows:
        price = float(row.price)
        unit = row.unit

        previous_price = previous_price_by_unit.get(unit)
        difference = (
            round(price - previous_price, 2)
            if previous_price is not None
            else None
        )

        points.append(
            {
                "id": row.id,
                "timestamp": row.created_at.isoformat(),
                "price": price,
                "difference": difference,
                "unit": unit,
                "user_id": row.user_id,
                "submitter_name": row.submitter_name,
            }
        )

        previous_price_by_unit[unit] = price

    # Keep the chart data chronological, but return the table data
    # newest-first for the admin dashboard.
    table_points = list(reversed(points))

    return {
        "vegetable": vegetable.name,
        "unit": vegetable.unit,
        "total_entries": len(points),
        "points": points,
        "latest_points": table_points,
    }
