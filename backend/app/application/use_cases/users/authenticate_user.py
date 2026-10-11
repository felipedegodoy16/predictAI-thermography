from app.application.ports.password_hasher import PasswordHasher
from app.domain.entity.user import User
from app.domain.exceptions.authentication import InvalidCredentialsError
from app.domain.repositories.user_repository import IUserRepository


class AuthenticateUser:
    def __init__(
        self,
        repository: IUserRepository,
        password_hasher: PasswordHasher,
    ) -> None:
        self._repository = repository
        self._password_hasher = password_hasher

    async def execute(self, *, email: str, password: str) -> User:
        normalized_email = email.strip().casefold()
        user = await self._repository.get_by_email(normalized_email)
        if user is None or not self._password_hasher.verify(
            password, user.password_hash
        ):
            raise InvalidCredentialsError
        return user
