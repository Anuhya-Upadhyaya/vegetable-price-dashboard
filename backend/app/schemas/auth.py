from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, model_validator


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    username: str = Field(min_length=3, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=10, max_length=20)

    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)

    @model_validator(mode="after")
    def validate_passwords(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")

        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    status: str

    model_config = {
        "from_attributes": True
    }
class AdminUserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    email: EmailStr
    phone: str
    role: str
    status: str
    email_verified: bool
    mfa_enabled: bool
    created_at: datetime
    approved_at: datetime | None
    approved_by: int | None