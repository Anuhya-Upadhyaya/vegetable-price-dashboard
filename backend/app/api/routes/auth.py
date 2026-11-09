from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import bearer_scheme, get_current_user
from app.core.security import create_access_token
from app.db.session import get_db
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
)
from app.services.auth import authenticate_user, register_user
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.core.config import settings
from app.models.user_session import UserSession
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import select

from app.core.security import create_access_token, decode_access_token
from app.models.user_session import UserSession


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# ============================================================
# REGISTER
# ============================================================

@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
)
def register(
    register_data: RegisterRequest,
    db: Session = Depends(get_db),
):
    try:
        user = register_user(
            db=db,
            full_name=register_data.full_name,
            username=register_data.username,
            email=register_data.email,
            phone=register_data.phone,
            password=register_data.password,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration details are already in use",
        )

    return {
        "message": (
            "Registration submitted successfully. "
            "Awaiting administrator approval."
        ),
        "user_id": user.id,
        "username": user.username,
        "status": user.status,
    }


# ============================================================
# LOGIN
# ============================================================

@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):
    user = authenticate_user(
        db=db,
        email=login_data.email,
        password=login_data.password,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    now = datetime.now(timezone.utc)

    expires_at = now + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    session_id = uuid4().hex

    user_session = UserSession(
        user_id=user.id,
        session_id=session_id,
        last_seen_at=now,
        expires_at=expires_at,
    )

    try:
        db.add(user_session)
        db.flush()

        access_token = create_access_token(
            subject=str(user.id),
            expires_delta=timedelta(
                minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
            ),
            extra_claims={"sid": session_id},
        )

        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }

# ============================================================
# CURRENT USER
# ============================================================

@router.get("/me")
def get_me(
    current_user=Depends(get_current_user),
):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role.name,
        "status": current_user.status,
        "email_verified": current_user.email_verified,
        "mfa_enabled": current_user.mfa_enabled,
        "created_at": current_user.created_at,
        "approved_at": current_user.approved_at,
        "approved_by": current_user.approved_by,
    }
@router.post("/heartbeat")
def heartbeat(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload = decode_access_token(credentials.credentials)
    session_id = payload.get("sid")

    user_session = db.scalar(
        select(UserSession).where(
            UserSession.session_id == session_id,
            UserSession.user_id == current_user.id,
            UserSession.revoked_at.is_(None),
        )
    )

    if user_session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Active session not found",
        )

    user_session.last_seen_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "User activity recorded"}


@router.post("/logout")
def logout(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload = decode_access_token(credentials.credentials)
    session_id = payload.get("sid")

    user_session = db.scalar(
        select(UserSession).where(
            UserSession.session_id == session_id,
            UserSession.user_id == current_user.id,
            UserSession.revoked_at.is_(None),
        )
    )

    if user_session is not None:
        now = datetime.now(timezone.utc)
        user_session.revoked_at = now
        user_session.last_seen_at = now
        db.commit()

    return {"message": "Logged out successfully"}