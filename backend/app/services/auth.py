from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.role import Role
from app.models.user import User
from app.models.price_entry import PriceEntry

def authenticate_user(
    db: Session,
    email: str,
    password: str,
) -> User | None:
    statement = select(User).where(User.email == email)
    user = db.scalar(statement)

    if user is None:
        return None

    if not verify_password(password, user.password_hash):
        return None

    if user.status != "approved":
        return None

    return user

def register_user(
    db: Session,
    *,
    full_name: str,
    username: str,
    email: str,
    phone: str,
    password: str,
) -> User:
    existing_username = db.scalar(
        select(User).where(User.username == username)
    )

    if existing_username is not None:
        raise ValueError("Username is already registered")

    existing_email = db.scalar(
        select(User).where(User.email == email)
    )

    if existing_email is not None:
        raise ValueError("Email is already registered")

    existing_phone = db.scalar(
        select(User).where(User.phone == phone)
    )

    if existing_phone is not None:
        raise ValueError("Phone number is already registered")

    user_role = db.scalar(
        select(Role).where(Role.name == "user")
    )

    if user_role is None:
        raise ValueError("User role is not configured")

    user = User(
        full_name=full_name,
        username=username,
        email=email,
        phone=phone,
        password_hash=hash_password(password),
        role_id=user_role.id,
        status="pending",
        email_verified=False,
        mfa_enabled=False,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user
def approve_user(
    db: Session,
    *,
    user_id: int,
    admin_user_id: int,
) -> User:
    user = db.get(User, user_id)

    if user is None:
        raise ValueError("User not found")

    if user.status != "pending":
        raise ValueError(
            f"User cannot be approved because their current status is '{user.status}'"
        )

    user.status = "approved"
    user.approved_at = datetime.now(timezone.utc)
    user.approved_by = admin_user_id

    db.commit()
    db.refresh(user)

    return user
def get_all_users(
    db: Session,
) -> list[User]:
    statement = (
        select(User)
        .order_by(User.created_at.desc())
    )

    return list(db.scalars(statement).all())

def delete_user(
    db: Session,
    *,
    user_id: int,
    admin_user_id: int,
) -> User:
    """Delete a non-admin account, preserving valid approver references."""
    user = db.get(User, user_id)
    if user is None:
        raise ValueError("User not found")

    if user.id == admin_user_id:
        raise ValueError("You cannot remove your own administrator account")

    if user.role is not None and user.role.name.lower() == "admin":
        raise ValueError("Administrator accounts cannot be removed here")

    # Users may have approved other accounts. Clear those references first so
    # the users.approved_by foreign key remains valid after deletion.
    approved_users = db.scalars(
        select(User).where(User.approved_by == user_id)
    ).all()
    for approved_user in approved_users:
        approved_user.approved_by = None

    # Keep historical price entries. The user_id foreign key uses ON DELETE SET NULL,
    # and each entry stores a submitter_name snapshot for trend/audit history.
    db.delete(user)
    db.commit()
    return user
