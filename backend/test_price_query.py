from datetime import date

from app.db.session import SessionLocal
from app.services.price_query_service import (
    get_latest_price,
    get_price_history,
)


db = SessionLocal()

try:
    latest = get_latest_price(db, "Onion")
    print("Latest onion price:", latest)

    history = get_price_history(
        db,
        vegetable="Onion",
        start_date=date(2026, 1, 1),
        end_date=date.today(),
        limit=10,
    )
    print("Onion history:", history)

finally:
    db.close()