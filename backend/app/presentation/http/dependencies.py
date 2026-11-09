from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

import asyncpg
from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.application.ports.password_hasher import PasswordHasher
from app.application.use_cases.users.authenticate_user import AuthenticateUser
from app.application.use_cases.users.create_user import CreateUser
from app.application.use_cases.users.update_user import UpdateUser
from app.domain.repositories.user_repository import IUserRepository
from app.infrastructure.database.postgres import Database
from app.infrastructure.security.access_tokens import verify_access_token
from app.infrastructure.persistence.postgres_user_repository import (
    PostgresUserRepository,
)
from app.infrastructure.persistence.postgres_account_repository import PostgresAccountRepository
from app.infrastructure.persistence.postgres_refresh_token_repository import (
    PostgresRefreshTokenRepository,
)
from app.infrastructure.persistence.postgres_service_order_repository import (
    PostgresServiceOrderRepository,
)
from app.infrastructure.persistence.postgres_equipment_repository import (
    PostgresEquipmentRepository,
)
from app.infrastructure.persistence.postgres_thermographic_image_repository import (
    PostgresThermographicImageRepository,
)
from app.infrastructure.persistence.postgres_dashboard_repository import (
    PostgresDashboardRepository,
)
from app.infrastructure.security.argon2_password_hasher import Argon2PasswordHasher

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthenticatedUser:
    id: UUID
    email: str
    role: str
    account_id: UUID | None
    account_name: str | None
    permissions: frozenset[str]

    @property
    def is_master(self) -> bool:
        return self.role == "master_admin"


async def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ],
    request: Request,
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
        user_id = UUID(str(claims["sub"]))
        database: Database = request.app.state.database
        user = await PostgresUserRepository(database.get_pool()).get_by_id(user_id)
        if user is None:
            raise ValueError("User no longer exists")
        if user.role != "master_admin" and user.account_id is None:
            raise ValueError("Account user has no account")
        return AuthenticatedUser(
            id=user.id,
            email=user.email,
            role=user.role,
            account_id=user.account_id,
            account_name=user.account_name,
            permissions=frozenset(user.permissions),
        )
    except (ValueError, KeyError, TypeError):
        raise unauthorized from None


def require_permissions(*required_permissions: str):
    required = frozenset(required_permissions)

    async def permission_dependency(
        current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    ) -> AuthenticatedUser:
        if not current_user.is_master and not required.issubset(current_user.permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return current_user

    return permission_dependency


def get_pool(request: Request) -> asyncpg.Pool:
    database: Database = request.app.state.database
    return database.get_pool()


async def get_account_scope(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    pool: Annotated[asyncpg.Pool, Depends(get_pool)],
    account_id: Annotated[UUID | None, Header(alias="X-Account-ID")] = None,
) -> UUID | None:
    if current_user.is_master:
        if account_id is not None:
            exists = await pool.fetchval(
                "SELECT EXISTS(SELECT 1 FROM accounts WHERE id = $1 AND is_active)", account_id
            )
            if not exists:
                raise HTTPException(status_code=404, detail="Conta não encontrada.")
        return account_id
    if account_id is not None and account_id != current_user.account_id:
        raise HTTPException(status_code=403, detail="Acesso restrito à sua conta.")
    return current_user.account_id


def get_user_repository(
    pool: Annotated[asyncpg.Pool, Depends(get_pool)],
) -> IUserRepository:
    return PostgresUserRepository(pool)


def get_account_repository(
    pool: Annotated[asyncpg.Pool, Depends(get_pool)],
) -> PostgresAccountRepository:
    return PostgresAccountRepository(pool)


def get_refresh_token_repository(
    pool: Annotated[asyncpg.Pool, Depends(get_pool)],
) -> PostgresRefreshTokenRepository:
    return PostgresRefreshTokenRepository(pool)


def get_service_order_repository(
    pool: Annotated[asyncpg.Pool, Depends(get_pool)],
    account_id: Annotated[UUID | None, Depends(get_account_scope)],
) -> PostgresServiceOrderRepository:
    return PostgresServiceOrderRepository(pool, account_id=account_id)


def get_equipment_repository(
    pool: Annotated[asyncpg.Pool, Depends(get_pool)],
    account_id: Annotated[UUID | None, Depends(get_account_scope)],
) -> PostgresEquipmentRepository:
    return PostgresEquipmentRepository(pool, account_id=account_id)


def get_thermographic_image_repository(
    pool: Annotated[asyncpg.Pool, Depends(get_pool)],
    account_id: Annotated[UUID | None, Depends(get_account_scope)],
) -> PostgresThermographicImageRepository:
    return PostgresThermographicImageRepository(pool, account_id=account_id)


def get_dashboard_repository(
    pool: Annotated[asyncpg.Pool, Depends(get_pool)],
    account_id: Annotated[UUID | None, Depends(get_account_scope)],
) -> PostgresDashboardRepository:
    return PostgresDashboardRepository(pool, account_id=account_id)


def get_password_hasher() -> PasswordHasher:
    return Argon2PasswordHasher()


def get_create_user_use_case(
    repository: Annotated[IUserRepository, Depends(get_user_repository)],
    password_hasher: Annotated[PasswordHasher, Depends(get_password_hasher)],
) -> CreateUser:
    return CreateUser(repository=repository, password_hasher=password_hasher)


def get_update_user_use_case(
    repository: Annotated[IUserRepository, Depends(get_user_repository)],
) -> UpdateUser:
    return UpdateUser(repository=repository)


def get_authenticate_user_use_case(
    repository: Annotated[IUserRepository, Depends(get_user_repository)],
    password_hasher: Annotated[PasswordHasher, Depends(get_password_hasher)],
) -> AuthenticateUser:
    return AuthenticateUser(repository=repository, password_hasher=password_hasher)


__all__ = [
    "AuthenticatedUser",
    "get_authenticate_user_use_case",
    "get_create_user_use_case",
    "get_update_user_use_case",
    "get_current_user",
    "get_service_order_repository",
    "get_equipment_repository",
    "get_thermographic_image_repository",
    "get_dashboard_repository",
    "get_refresh_token_repository",
    "require_permissions",
]
