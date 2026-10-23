
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.price_entry import PriceEntry


def get_latest_price(
    db: Session,
    vegetable: str,
) -> dict | None:
    """Return the most recently dated entry for a vegetable."""

    normalized_name = vegetable.strip()

    if not normalized_name:
        return None

    statement = (
        select(PriceEntry)
        .where(
            func.lower(PriceEntry.vegetable)
            == normalized_name.lower()
        )
        .order_by(
            PriceEntry.entry_date.desc(),
            PriceEntry.created_at.desc(),
            PriceEntry.id.desc(),
        )
        .limit(1)
    )

    entry = db.scalar(statement)

    if entry is None:
        return None

    return {
        "vegetable": entry.vegetable,
        "price": str(entry.price),
        "unit": entry.unit,
        "entry_date": entry.entry_date.isoformat(),
        "record_updated": entry.is_updated,
    }


def get_price_history(
    db: Session,
    vegetable: str,
    start_date: date,
    end_date: date,
    limit: int = 30,
) -> list[dict]:
    """Return recorded prices within an inclusive date range."""

    normalized_name = vegetable.strip()

    if not normalized_name or start_date > end_date:
        return []

    safe_limit = max(1, min(limit, 100))

    statement = (
        select(PriceEntry)
        .where(
            func.lower(PriceEntry.vegetable)
            == normalized_name.lower(),
            PriceEntry.entry_date >= start_date,
            PriceEntry.entry_date <= end_date,
        )
        .order_by(
            PriceEntry.entry_date.desc(),
            PriceEntry.created_at.desc(),
            PriceEntry.id.desc(),
        )
        .limit(safe_limit)
    )

    entries = db.scalars(statement).all()

    return [
        {
            "vegetable": entry.vegetable,
            "price": str(entry.price),
            "unit": entry.unit,
            "entry_date": entry.entry_date.isoformat(),
            "record_updated": entry.is_updated,
        }
        for entry in entries
    ]
