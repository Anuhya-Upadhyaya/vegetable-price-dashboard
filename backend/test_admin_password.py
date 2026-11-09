
from getpass import getpass
from sqlalchemy import select

from app.core.security import verify_password
from app.db.session import SessionLocal
from app.models.user import User

ADMIN_EMAIL = "taiyo26akari@gmail.com"

db = SessionLocal()

try:
    user = db.scalar(
        select(User).where(User.email == ADMIN_EMAIL)
    )

    if user is None:
        print("Admin account not found.")
    else:
        password = getpass("Enter the password you are trying to use: ")
        if verify_password(password, user.password_hash):
            print("Password verification: SUCCESS")
        else:
            print("Password verification: FAILED")
finally:
    db.close()
