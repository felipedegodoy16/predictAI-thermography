from typing import Protocol
from datetime import datetime
from uuid import UUID

from app.domain.entity.user import User, UserOption


class IUserRepository(Protocol):
    async def get_by_email(self, email: str) -> User | None: ...

    async def get_by_id(self, user_id: UUID) -> User | None: ...

    async def list_users(
        self, *, limit: int, offset: int, query: str | None = None
    ) -> list[User]: ...

    async def list_user_options(self) -> list[UserOption]: ...

    async def update_profile(
        self, *, user_id: UUID, name: str | None, email: str | None,
        role: str | None = None,
    ) -> User | None: ...

    async def delete(self, *, user_id: UUID) -> bool: ...

    async def add(self, user: User) -> User: ...

    async def store_password_reset_token(
        self, *, user_id: UUID, token_hash: str, expires_at: datetime
    ) -> None: ...

    async def reset_password(self, *, token_hash: str, password_hash: str) -> bool: ...
