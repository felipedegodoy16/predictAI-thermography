from uuid import UUID

from app.domain.entity.user import User
from app.domain.repositories.user_repository import IUserRepository


class UpdateUser:
    def __init__(self, repository: IUserRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        *,
        user_id: UUID,
        name: str | None,
        email: str | None,
    ) -> User | None:
        normalized_name = name.strip() if name is not None else None
        normalized_email = email.strip().casefold() if email is not None else None
        return await self._repository.update_profile(
            user_id=user_id,
            name=normalized_name,
            email=normalized_email,
        )
