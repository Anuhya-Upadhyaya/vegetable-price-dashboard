
"""Create and manage reversible FreshFlow demonstration price data.

Run from the backend folder.

Preview demo-account creation and price seeding:
    python seed_freshflow_demo_prices.py --create-demo-users --dry-run

Create missing demo accounts and seed synthetic price histories:
    python seed_freshflow_demo_prices.py --create-demo-users

Preview updates to existing demo accounts:
    python seed_freshflow_demo_prices.py --update-demo-users --dry-run

Update demo usernames, names, emails, phones, and password hashes:
    python seed_freshflow_demo_prices.py --update-demo-users

The older --update-demo-passwords option remains supported.

Seed prices for an existing user:
    python seed_freshflow_demo_prices.py --username Aarav --dry-run
    python seed_freshflow_demo_prices.py --username Aarav

Preview removal of marked synthetic price rows:
    python seed_freshflow_demo_prices.py --username Aarav --cleanup --dry-run

Remove only marked synthetic price rows:
    python seed_freshflow_demo_prices.py --username Aarav --cleanup

All generated prices are illustrative, not actual market quotations.
Passwords are stored as secure hashes, never as plain text.
"""

from __future__ import annotations

import argparse
import math
import random
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.price_entry import PriceEntry
from app.models.role import Role
from app.models.user import User
from app.models.vegetable import Vegetable


MARKER = "FRESHFLOW_DEMO_SEED:v1"
DAYS = 90
SEED = 20261015

# Illustrative ranges only; these are not actual market quotations.
PRICE_RANGES: dict[str, tuple[float, float]] = {
    "garlic": (120.0, 220.0),
    "ginger": (60.0, 140.0),
    "lemon": (4.0, 15.0),
    "onion": (20.0, 65.0),
    "potato": (18.0, 45.0),
    "tomato": (15.0, 80.0),
    "green chilli": (25.0, 100.0),
    "chilli": (25.0, 100.0),
    "carrot": (25.0, 70.0),
    "cabbage": (15.0, 45.0),
    "cauliflower": (20.0, 65.0),
    "beans": (30.0, 100.0),
    "brinjal": (20.0, 65.0),
    "cucumber": (15.0, 50.0),
    "capsicum": (35.0, 120.0),
    "spinach": (10.0, 35.0),
}


# These are the exact target records requested.
#
# legacy_usernames allows the updater to find accounts created by earlier
# versions of this seeder. It changes a matched account's username to the
# target username when --update-demo-users is used.
#
# If your database has different legacy usernames, add them here before
# running the updater.
DEMO_USERS = [
    {
        "username": "Aarav",
        "legacy_usernames": [
            "freshflow_demo_01",
            "Aarav Sharma",
        ],
        "full_name": "Aarav Sharma",
        "email": "aarav26@gmail.com",
        "phone": "7293374625",
        "password": "Aarav26Aarav",
    },
    {
        "username": "Ananya",
        "legacy_usernames": [
            "freshflow_demo_02",
            "Ananya Rao",
        ],
        "full_name": "Ananya Rao",
        "email": "ananya26@gmail.com",
        "phone": "9936472816",
        "password": "Ananya26Ananya",
    },
    {
        "username": "Rohan",
        "legacy_usernames": [
            "freshflow_demo_03",
            "Rohan Kulkarni",
        ],
        "full_name": "Rohan Kulkarni",
        "email": "rohan26@gmail.com",
        "phone": "7998263827",
        "password": "Rohan26Rohan",
    },
    {
        "username": "Meera",
        "legacy_usernames": [
            "freshflow_demo_04",
            "Meera Nair",
        ],
        "full_name": "Meera Nair",
        "email": "meera26@gmail.com",
        "phone": "9093826482",
        "password": "Meera26Meera",
    },
    {
        "username": "Kiran",
        "legacy_usernames": [
            "freshflow_demo_05",
            "Kiran Gowda",
        ],
        "full_name": "Kiran Gowda",
        "email": "kiran26@gmail.com",
        "phone": "8882736451",
        "password": "Kiran26Kiran",
    },
]


def price_range(name: str, unit: str) -> tuple[float, float]:
    """Return an illustrative price range for a vegetable."""
    key = name.strip().lower()

    if key in PRICE_RANGES:
        return PRICE_RANGES[key]

    if unit.strip().lower() in {"piece", "pieces"}:
        return 3.0, 20.0

    return 20.0, 80.0


def find_demo_user(db, item: dict) -> User | None:
    """Find an account by its target or configured legacy username."""
    usernames = [item["username"], *item["legacy_usernames"]]

    matches = list(
        db.scalars(
            select(User).where(User.username.in_(usernames))
        )
    )

    if len(matches) > 1:
        raise RuntimeError(
            f"Multiple accounts match {item['username']!r}: "
            f"{[user.username for user in matches]}. "
            "Resolve the duplicate matches before proceeding."
        )

    return matches[0] if matches else None


def find_admin(db) -> User:
    """Find an existing administrator for approval metadata."""
    admin_role = db.scalar(
        select(Role).where(Role.name == "admin")
    )

    if admin_role is None:
        raise RuntimeError(
            "The 'admin' role is missing. No changes were committed."
        )

    admin = db.scalar(
        select(User)
        .where(User.role_id == admin_role.id)
        .order_by(User.id)
    )

    if admin is None:
        raise RuntimeError(
            "No administrator account exists. No changes were committed."
        )

    return admin


def validate_demo_configuration() -> None:
    """Reject duplicate target identity values in the configuration."""
    for field in ("username", "email", "phone"):
        values = [item[field].casefold() for item in DEMO_USERS]

        if len(values) != len(set(values)):
            raise RuntimeError(
                f"DEMO_USERS contains duplicate target {field} values."
            )


def make_price_rows(
    user: User,
    vegetables: list[Vegetable],
    first_day: date,
    today: date,
    days: int,
    db,
) -> tuple[list[PriceEntry], int]:
    """Plan missing marked price rows without replacing existing entries."""
    existing = list(
        db.scalars(
            select(PriceEntry).where(
                PriceEntry.user_id == user.id,
                PriceEntry.notes.like(f"{MARKER}:%"),
                PriceEntry.entry_date >= first_day,
                PriceEntry.entry_date <= today,
            )
        )
    )

    existing_keys = {
        (row.vegetable.casefold(), row.entry_date)
        for row in existing
    }

    planned: list[PriceEntry] = []
    skipped = 0
    rng = random.Random(SEED + user.id)

    for veg in vegetables:
        low, high = price_range(veg.name, veg.unit or "kg")
        base = (low + high) / 2
        amplitude = (high - low) * 0.19

        for day_offset in range(days):
            day = first_day + timedelta(days=day_offset)
            key = (veg.name.casefold(), day)

            if key in existing_keys:
                skipped += 1
                continue

            seasonal = math.sin(
                day_offset / 8.5 + (len(veg.name) % 5)
            ) * amplitude

            weekly = (
                math.sin(day_offset * 2 * math.pi / 7)
                * (high - low)
                * 0.045
            )

            noise = rng.uniform(
                -(high - low) * 0.035,
                (high - low) * 0.035,
            )

            value = min(high, max(low, base + seasonal + weekly + noise))

            minute_of_day = 8 * 60 + rng.randint(0, 9 * 60)
            created_at = datetime.combine(
                day, time.min, tzinfo=timezone.utc
            ) + timedelta(minutes=minute_of_day)

            note = (
                f"{MARKER}: synthetic demonstration data; "
                "not a real market quote"
            )

            planned.append(
                PriceEntry(
                    user_id=user.id,
                    submitter_name=(
                        user.full_name or user.username
                    )[:150],
                    vegetable=veg.name,
                    price=Decimal(f"{value:.2f}"),
                    unit=veg.unit or "kg",
                    entry_date=day,
                    notes=note,
                    created_at=created_at,
                )
            )

    return planned, skipped


def resolve_demo_accounts(
    db,
) -> list[tuple[dict, User | None]]:
    """Match all demo identities before any changes are applied."""
    matched: list[tuple[dict, User | None]] = []
    claimed_user_ids: set[int] = set()

    for item in DEMO_USERS:
        user = find_demo_user(db, item)

        if user is not None:
            if user.id in claimed_user_ids:
                raise RuntimeError(
                    f"One database account matched more than one demo "
                    f"identity. Check the legacy usernames for "
                    f"{item['username']!r}."
                )

            claimed_user_ids.add(user.id)

        matched.append((item, user))

    return matched


def validate_identity_conflicts(
    db,
    matched: list[tuple[dict, User | None]],
) -> None:
    """Ensure target usernames, emails, and phones aren't owned elsewhere."""
    for item, user in matched:
        target_fields = [
            (User.username, item["username"], "username"),
            (User.email, item["email"], "email"),
            (User.phone, item["phone"], "phone"),
        ]

        for column, value, label in target_fields:
            query = select(User).where(column == value)

            if user is not None:
                query = query.where(User.id != user.id)

            other = db.scalar(query)

            if other is not None:
                raise RuntimeError(
                    f"Cannot update {item['username']!r}: target "
                    f"{label} {value!r} is already assigned to account "
                    f"{other.username!r}. No changes were committed."
                )


def ensure_demo_accounts(
    db,
    update_existing: bool,
) -> tuple[list[User], int, int]:
    """Create missing demo users and optionally update matched accounts.

    With update_existing=True, existing matched accounts receive the
    configured username, full name, email, phone, and password hash.
    Existing user IDs and price histories are preserved.
    """
    validate_demo_configuration()

    user_role = db.scalar(
        select(Role).where(Role.name == "user")
    )

    if user_role is None:
        raise RuntimeError(
            "The 'user' role is missing. Configure roles first."
        )

    admin = find_admin(db)
    now = datetime.now(timezone.utc)
    matched = resolve_demo_accounts(db)

    if update_existing:
        validate_identity_conflicts(db, matched)

    users: list[User] = []
    created_count = 0
    updated_count = 0

    for item, user in matched:
        if user is None:
            # In creation mode, identity conflicts are still checked.
            if not update_existing:
                validate_identity_conflicts(db, [(item, None)])

            user = User(
                username=item["username"],
                full_name=item["full_name"],
                email=item["email"],
                phone=item["phone"],
                password_hash=hash_password(item["password"]),
                role_id=user_role.id,
                status="approved",
                email_verified=False,
                mfa_enabled=False,
                approved_at=now,
                approved_by=admin.id,
            )

            db.add(user)
            users.append(user)
            created_count += 1
            continue

        if update_existing:
            user.username = item["username"]
            user.full_name = item["full_name"]
            user.email = item["email"]
            user.phone = item["phone"]
            user.password_hash = hash_password(item["password"])
            updated_count += 1

        users.append(user)

    # Assign IDs to new records for price planning; does not commit.
    db.flush()

    return users, created_count, updated_count


def cleanup_user(username: str, dry_run: bool = False) -> None:
    """Delete only synthetic price rows carrying this script's marker."""
    with SessionLocal() as db:
        try:
            user = db.scalar(
                select(User).where(User.username == username)
            )

            if user is None:
                raise RuntimeError(
                    f"No user found with username {username!r}."
                )

            rows = list(
                db.scalars(
                    select(PriceEntry).where(
                        PriceEntry.user_id == user.id,
                        PriceEntry.notes.like(f"{MARKER}:%"),
                    )
                )
            )

            print(
                f"User: {user.username}; marked price rows found: "
                f"{len(rows)}"
            )

            if dry_run:
                db.rollback()
                print("DRY RUN: no price rows were deleted.")
                return

            for row in rows:
                db.delete(row)

            db.commit()
            print(
                f"Removed {len(rows)} marked synthetic price entries. "
                "The user account and unmarked entries were preserved."
            )

        except Exception:
            db.rollback()
            raise


def print_demo_login_details() -> None:
    """Print configured login details for local development use."""
    print("\nConfigured demo login details:")

    for item in DEMO_USERS:
        print(f"\nUsername: {item['username']}")
        print(f"Email:    {item['email']}")
        print(f"Password: {item['password']}")

    print(
        "\nKeep these development credentials private and do not use "
        "them for real accounts or a deployed production system."
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Manage FreshFlow demonstration users and price data."
    )

    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--username",
        help="Existing username to seed or clean up",
    )
    group.add_argument(
        "--create-demo-users",
        action="store_true",
        help="Create missing demo accounts and seed price histories",
    )
    group.add_argument(
        "--update-demo-users",
        "--update-demo-passwords",
        dest="update_demo_users",
        action="store_true",
        help=(
            "Update matched demo accounts' usernames, names, emails, "
            "phones, and password hashes"
        ),
    )

    parser.add_argument(
        "--days",
        type=int,
        default=DAYS,
        help=f"Number of days including today (default: {DAYS})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes and roll back without saving",
    )
    parser.add_argument(
        "--cleanup",
        action="store_true",
        help="Remove only marked synthetic price rows for --username",
    )

    args = parser.parse_args()

    if not 1 <= args.days <= 365:
        parser.error("--days must be between 1 and 365")

    if args.cleanup:
        if not args.username:
            parser.error("--cleanup requires --username")

        cleanup_user(args.username, dry_run=args.dry_run)
        return

    if args.dry_run:
        print("DRY RUN: database changes will be rolled back.")

    with SessionLocal() as db:
        try:
            if args.update_demo_users:
                users, created_count, updated_count = ensure_demo_accounts(
                    db,
                    update_existing=True,
                )

                print(f"Existing demo accounts updated: {updated_count}")
                print(f"Missing demo accounts created: {created_count}")

                for user in users:
                    print(
                        f"Matched account: {user.username} "
                        f"(ID: {user.id})"
                    )

                if args.dry_run:
                    db.rollback()
                    print("DRY RUN: no account changes were saved.")
                    return

                db.commit()
                print("Demo account updates committed successfully.")
                print("Existing user IDs and price history were preserved.")
                print_demo_login_details()
                return

            if args.create_demo_users:
                users, created_count, _ = ensure_demo_accounts(
                    db,
                    update_existing=False,
                )

                print(f"New demo accounts staged: {created_count}")
                print(
                    "Existing matched accounts were reused without "
                    "changing their profile fields or passwords."
                )

            else:
                user = db.scalar(
                    select(User).where(User.username == args.username)
                )

                if user is None:
                    raise RuntimeError(
                        f"No user found with username {args.username!r}."
                    )

                users = [user]

            vegetables = list(
                db.scalars(
                    select(Vegetable)
                    .where(Vegetable.is_active.is_(True))
                    .order_by(Vegetable.name)
                )
            )

            if not vegetables:
                raise RuntimeError(
                    "No active vegetables found. No changes were committed."
                )

            today = date.today()
            first_day = today - timedelta(days=args.days - 1)

            all_planned: list[PriceEntry] = []
            total_skipped = 0

            for user in users:
                planned, skipped = make_price_rows(
                    user=user,
                    vegetables=vegetables,
                    first_day=first_day,
                    today=today,
                    days=args.days,
                    db=db,
                )

                all_planned.extend(planned)
                total_skipped += skipped

                print(
                    f"{user.username}: {len(planned)} rows planned; "
                    f"{skipped} existing marked combinations skipped."
                )

            print(f"Date range: {first_day} through {today}")
            print(f"Active vegetables: {len(vegetables)}")
            print(f"Total rows planned: {len(all_planned)}")
            print(f"Existing combinations skipped: {total_skipped}")

            if args.dry_run:
                db.rollback()
                print("DRY RUN: no account or price changes were saved.")
                return

            db.add_all(all_planned)
            db.commit()

            print("\nSynthetic demonstration price data committed.")
            print(f"Generated rows are marked with {MARKER}.")

            print("\nCleanup commands:")
            for user in users:
                print(
                    "python seed_freshflow_demo_prices.py "
                    f"--username {user.username} --cleanup"
                )

        except Exception:
            db.rollback()
            raise


if __name__ == "__main__":
    main()
