from typing import Protocol
from uuid import UUID

from app.domain.entity.account import Account


class IAccountRepository(Protocol):
    async def create_with_admin(
        self,
        *,
        name: str,
        slug: str,
        admin_name: str,
        admin_email: str,
        admin_password_hash: str,
    ) -> tuple[Account, UUID]: ...

    async def list_accounts(self) -> list[Account]: ...

    async def get_by_id(self, account_id: UUID) -> Account | None: ...
