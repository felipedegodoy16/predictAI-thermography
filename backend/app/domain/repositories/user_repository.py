from typing import Protocol

from app.domain.entity.user import User


class IUserRepository(Protocol):
    async def get_by_email(self, email: str) -> User | None: ...

    async def add(self, user: User) -> User: ...
