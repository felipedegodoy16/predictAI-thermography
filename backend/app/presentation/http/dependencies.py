from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

import asyncpg
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.application.ports.password_hasher import PasswordHasher
from app.application.use_cases.users.authenticate_user import AuthenticateUser
from app.application.use_cases.users.create_user import CreateUser
from app.domain.repositories.user_repository import IUserRepository
from app.infrastructure.database.postgres import Database
from app.infrastructure.security.access_tokens import verify_access_token
from app.infrastructure.persistence.postgres_user_repository import (
    PostgresUserRepository,
)
from app.infrastructure.persistence.postgres_refresh_token_repository import (
    PostgresRefreshTokenRepository,
)
from app.infrastructure.persistence.postgres_service_order_repository import (
    PostgresServiceOrderRepository,
)
from app.infrastructure.security.argon2_password_hasher import Argon2PasswordHasher

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthenticatedUser:
    id: UUID
    email: str
    permissions: frozenset[str]


async def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ],
) -> AuthenticatedUser:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing access token.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthorized
    try:
        claims = verify_access_token(credentials.credentials)
        return AuthenticatedUser(
            id=UUID(str(claims["sub"])),
            email=str(claims["email"]),
            permissions=frozenset(claims["permissions"]),
        )
    except (ValueError, KeyError, TypeError):
        raise unauthorized from None


def require_permissions(*required_permissions: str):
    required = frozenset(required_permissions)

    async def permission_dependency(
        current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    ) -> AuthenticatedUser:
        if not required.issubset(current_user.permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return current_user

    return permission_dependency


def get_pool(request: Request) -> asyncpg.Pool:
    database: Database = request.app.state.database
    return database.get_pool()


def get_user_repository(
    pool: Annotated[asyncpg.Pool, Depends(get_pool)],
) -> IUserRepository:
    return PostgresUserRepository(pool)


def get_refresh_token_repository(
    pool: Annotated[asyncpg.Pool, Depends(get_pool)],
) -> PostgresRefreshTokenRepository:
    return PostgresRefreshTokenRepository(pool)


def get_service_order_repository(
    pool: Annotated[asyncpg.Pool, Depends(get_pool)],
) -> PostgresServiceOrderRepository:
    return PostgresServiceOrderRepository(pool)


def get_password_hasher() -> PasswordHasher:
    return Argon2PasswordHasher()


def get_create_user_use_case(
    repository: Annotated[IUserRepository, Depends(get_user_repository)],
    password_hasher: Annotated[PasswordHasher, Depends(get_password_hasher)],
) -> CreateUser:
    return CreateUser(repository=repository, password_hasher=password_hasher)


def get_authenticate_user_use_case(
    repository: Annotated[IUserRepository, Depends(get_user_repository)],
    password_hasher: Annotated[PasswordHasher, Depends(get_password_hasher)],
) -> AuthenticateUser:
    return AuthenticateUser(repository=repository, password_hasher=password_hasher)


__all__ = [
    "AuthenticatedUser",
    "get_authenticate_user_use_case",
    "get_create_user_use_case",
    "get_current_user",
    "get_service_order_repository",
    "get_refresh_token_repository",
    "require_permissions",
]
