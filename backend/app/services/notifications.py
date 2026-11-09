
import logging
import smtplib
from email.message import EmailMessage

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.notification import Notification
from app.models.user import User


logger = logging.getLogger(__name__)


def notify_user(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    kind: str = "general",
) -> Notification:
    """Create an in-app notification for a specific user."""
    item = Notification(
        recipient_user_id=user_id,
        title=title,
        message=message,
        kind=kind,
    )
    db.add(item)
    return item


def notify_admins(
    db: Session,
    title: str,
    message: str,
    kind: str = "customer",
) -> None:
    """Create an in-app notification for every approved admin."""
    admins = db.scalars(
        select(User).where(
            User.status == "approved",
            User.role.has(name="admin"),
        )
    ).all()

    for admin in admins:
        notify_user(
            db=db,
            user_id=admin.id,
            title=title,
            message=message,
            kind=kind,
        )


def send_admin_email(subject: str, body: str) -> None:
    """
    Send an email notification to the configured admin email address.

    Raises RuntimeError when required SMTP settings are missing.
    Raises SMTPException or OSError when email delivery fails.
    """

    recipient = settings.ADMIN_NOTIFICATION_EMAIL

    required_settings = {
        "ADMIN_NOTIFICATION_EMAIL": recipient,
        "SMTP_HOST": settings.SMTP_HOST,
        "SMTP_FROM_EMAIL": settings.SMTP_FROM_EMAIL,
        "SMTP_USERNAME": settings.SMTP_USERNAME,
        "SMTP_PASSWORD": settings.SMTP_PASSWORD,
    }

    missing_settings = [
        setting_name
        for setting_name, setting_value in required_settings.items()
        if not setting_value
    ]

    if missing_settings:
        raise RuntimeError(
            "Admin email notification is not configured. "
            "Missing settings: " + ", ".join(missing_settings)
        )

    email = EmailMessage()
    email["Subject"] = subject
    email["From"] = settings.SMTP_FROM_EMAIL
    email["To"] = recipient
    email.set_content(body)

    try:
        with smtplib.SMTP(
            settings.SMTP_HOST,
            settings.SMTP_PORT,
            timeout=20,
        ) as server:

            server.ehlo()

            if settings.SMTP_USE_TLS:
                server.starttls()
                server.ehlo()

            server.login(
                settings.SMTP_USERNAME,
                settings.SMTP_PASSWORD,
            )

            server.send_message(email)

        logger.info(
            "Admin email notification sent successfully: %s",
            subject,
        )

    except (OSError, smtplib.SMTPException):
        logger.exception(
            "Failed to send admin email notification: %s",
            subject,
        )
        raise
