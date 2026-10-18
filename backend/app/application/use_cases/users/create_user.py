from app.application.ports.password_hasher import PasswordHasher
from app.domain.entity.user import User
from app.domain.exceptions.user import UserAlreadyExistsError
from app.domain.repositories.user_repository import IUserRepository


class CreateUser:
    def __init__(
        self,
        repository: IUserRepository,
        password_hasher: PasswordHasher,
    ) -> None:
        self._repository = repository
        self._password_hasher = password_hasher

    async def execute(
        self, *, name: str, email: str, password: str, role: str = "user"
    ) -> User:
        normalized_email = email.strip().casefold()
        if await self._repository.get_by_email(normalized_email) is not None:
            raise UserAlreadyExistsError(normalized_email)

        user = User.create(
            name=name.strip(),
            email=normalized_email,
            password_hash=self._password_hasher.hash(password),
            role=role,
        )
        return await self._repository.add(user)
