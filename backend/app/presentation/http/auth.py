from datetime import datetime, timedelta, timezone
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status

from app.application.use_cases.users.authenticate_user import AuthenticateUser
from app.core.config import settings
from app.domain.exceptions.authentication import InvalidCredentialsError
from app.infrastructure.security.access_tokens import create_access_token
from app.infrastructure.security.refresh_tokens import (
    generate_refresh_token,
    hash_refresh_token,
)
from app.presentation.http.dependencies import (
    get_authenticate_user_use_case,
    get_refresh_token_repository,
)
from app.infrastructure.persistence.postgres_refresh_token_repository import (
    PostgresRefreshTokenRepository,
)
from app.presentation.schemas.users import LoginRequest, RefreshRequest, TokenResponse

router = APIRouter()


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Log in and receive an access token",
)
async def login(
    payload: LoginRequest,
    use_case: Annotated[AuthenticateUser, Depends(get_authenticate_user_use_case)],
    refresh_tokens: Annotated[
        PostgresRefreshTokenRepository, Depends(get_refresh_token_repository)
    ],
) -> TokenResponse:
    try:
        user = await use_case.execute(email=str(payload.email), password=payload.password)
    except InvalidCredentialsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None

    access_token, expires_in = create_access_token(user)
    refresh_token = generate_refresh_token()
    refresh_expires_in = settings.refresh_token_expire_days * 24 * 60 * 60
    await refresh_tokens.create(
        user_id=user.id,
        family_id=uuid4(),
        token_hash=hash_refresh_token(refresh_token),
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=refresh_expires_in),
    )
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        refresh_expires_in=refresh_expires_in,
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Rotate a refresh token and receive a new token pair",
)
async def refresh(
    payload: RefreshRequest,
    refresh_tokens: Annotated[
        PostgresRefreshTokenRepository, Depends(get_refresh_token_repository)
    ],
) -> TokenResponse:
    new_refresh_token = generate_refresh_token()
    refresh_expires_in = settings.refresh_token_expire_days * 24 * 60 * 60
    user = await refresh_tokens.rotate(
        token_hash=hash_refresh_token(payload.refresh_token),
        replacement_hash=hash_refresh_token(new_refresh_token),
        replacement_expires_at=datetime.now(timezone.utc)
        + timedelta(seconds=refresh_expires_in),
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token. Log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token, expires_in = create_access_token(user)
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_in=expires_in,
        refresh_expires_in=refresh_expires_in,
    )
