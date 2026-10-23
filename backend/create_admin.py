from getpass import getpass

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.role import Role
from app.models.user import User


USERNAME = "Akari@Taiyo"
EMAIL = "taiyo26akari@gmail.com"
PHONE = "8736273736"


def main():
    password = getpass("Enter admin password: ")
    confirm_password = getpass("Confirm admin password: ")

    if password != confirm_password:
        print("Error: passwords do not match.")
        return

    if len(password) < 8:
        print("Error: password must contain at least 8 characters.")
        return

    with SessionLocal() as db:
        existing_user = db.scalar(
            select(User).where(User.email == EMAIL)
        )

        if existing_user is not None:
            print("Error: an account with this email already exists.")
            return

        admin_role = db.scalar(
            select(Role).where(Role.name == "admin")
        )

        if admin_role is None:
            print("Error: admin role is not configured.")
            return

        admin = User(
            username=USERNAME,
            full_name="Akari Taiyo",
            email=EMAIL,
            phone=PHONE,
            password_hash=hash_password(password),
            role_id=admin_role.id,
            status="approved",
            email_verified=True,
            mfa_enabled=False,
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print()
        print("Admin account created successfully.")
        print(f"User ID: {admin.id}")
        print(f"Username: {admin.username}")
        print(f"Email: {admin.email}")
        print(f"Role: {admin.role.name}")
        print(f"Status: {admin.status}")


if __name__ == "__main__":
    main()