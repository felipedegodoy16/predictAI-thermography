from typing import Protocol
from datetime import datetime
from uuid import UUID

from app.domain.entity.user import User


class IUserRepository(Protocol):
    async def get_by_email(self, email: str) -> User | None: ...

    async def list_users(
        self, *, limit: int, offset: int, query: str | None = None
    ) -> list[User]: ...

    async def update_profile(
        self, *, user_id: UUID, name: str | None, email: str | None
    ) -> User | None: ...

    async def add(self, user: User) -> User: ...

    async def store_password_reset_token(
        self, *, user_id: UUID, token_hash: str, expires_at: datetime
    ) -> None: ...

    async def reset_password(self, *, token_hash: str, password_hash: str) -> bool: ...
