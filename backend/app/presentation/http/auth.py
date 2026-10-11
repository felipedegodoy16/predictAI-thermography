from datetime import datetime, timedelta, timezone
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.application.use_cases.users.authenticate_user import AuthenticateUser
from app.application.ports.password_hasher import PasswordHasher
from app.core.config import Settings, get_settings, settings
from app.domain.exceptions.authentication import InvalidCredentialsError
from app.infrastructure.security.access_tokens import create_access_token
from app.infrastructure.security.password_reset_tokens import (
    create_password_reset_token,
    hash_password_reset_token,
    verify_password_reset_token,
)
from app.infrastructure.security.refresh_tokens import (
    generate_refresh_token,
    hash_refresh_token,
)
from app.presentation.http.dependencies import (
    get_authenticate_user_use_case,
    get_password_hasher,
    get_refresh_token_repository,
    get_user_repository,
)
from app.infrastructure.email.password_reset import send_password_reset_email
from app.infrastructure.persistence.postgres_refresh_token_repository import (
    PostgresRefreshTokenRepository,
)
from app.domain.repositories.user_repository import IUserRepository
from app.presentation.schemas.users import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    ResetPasswordRequest,
    TokenResponse,
)

router = APIRouter()


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Solicitar redefinição de senha",
    description="Envia um link temporário de redefinição quando o e-mail está cadastrado.",
)
async def forgot_password(
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    repository: Annotated[IUserRepository, Depends(get_user_repository)],
    config: Annotated[Settings, Depends(get_settings)],
) -> MessageResponse:
    """Solicita a redefinição sem revelar se o e-mail está cadastrado."""
    user = await repository.get_by_email(str(payload.email).strip().casefold())
    if user is not None:
        token, expires_at = create_password_reset_token(user.email, config)
        await repository.store_password_reset_token(
            user_id=user.id,
            token_hash=hash_password_reset_token(token),
            expires_at=expires_at,
        )
        background_tasks.add_task(
            send_password_reset_email,
            user.email,
            token,
            config,
        )

    return MessageResponse(
        detail=(
            "Se o e-mail estiver cadastrado em nosso sistema, "
            "um link para redefinição de senha foi enviado."
        )
    )


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Redefinir senha",
    description="Valida o token temporário e altera a senha da conta.",
)
async def reset_password(
    payload: ResetPasswordRequest,
    repository: Annotated[IUserRepository, Depends(get_user_repository)],
    password_hasher: Annotated[PasswordHasher, Depends(get_password_hasher)],
    config: Annotated[Settings, Depends(get_settings)],
) -> MessageResponse:
    """Redefine a senha com um token válido de uso único."""
    token_claims = verify_password_reset_token(payload.token, config)
    if token_claims is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de redefinição inválido ou expirado",
        )

    updated = await repository.reset_password(
        token_hash=hash_password_reset_token(payload.token),
        password_hash=password_hasher.hash(payload.new_password),
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de redefinição inválido ou expirado",
        )

    return MessageResponse(detail="Senha alterada com sucesso")


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
