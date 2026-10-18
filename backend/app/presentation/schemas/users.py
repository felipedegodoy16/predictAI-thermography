from datetime import datetime
from uuid import UUID

from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    role: Literal["user", "admin"] = "user"

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Name must not be blank")
        return value


class UserUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    role: Literal["user", "admin"] | None = None

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            raise ValueError("Name must not be blank")
        return value

    @field_validator("email")
    @classmethod
    def email_must_not_be_null(cls, value: EmailStr | None) -> EmailStr | None:
        if value is None:
            raise ValueError("Email must not be null")
        return value


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: EmailStr
    role: Literal["user", "admin"] = "user"
    created_at: datetime


class UserOptionResponse(BaseModel):
    id: UUID
    name: str
    email: EmailStr


class LoginRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_expires_in: int


class RefreshRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    refresh_token: str = Field(min_length=32, max_length=256)


class ForgotPasswordRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    token: str
    new_password: str = Field(
        min_length=12,
        max_length=128,
        alias="nova_senha",
    )


class MessageResponse(BaseModel):
    detail: str
