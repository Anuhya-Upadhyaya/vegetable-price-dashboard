
from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.user import User

ADMIN_EMAIL = "taiyo26akari@gmail.com"

db = SessionLocal()

try:
    user = db.scalar(
        select(User).where(User.email == ADMIN_EMAIL)
    )

    if user is None:
        print("Account found: NO")
    else:
        print("Account found: YES")
        print("Email matches: YES")
        print("Role:", user.role.name if user.role else "Unknown")
        print("Status:", user.status)
        print("Password hash exists:", bool(user.password_hash))
finally:
    db.close()
