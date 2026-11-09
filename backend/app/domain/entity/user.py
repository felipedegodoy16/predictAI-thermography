from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID, uuid4


@dataclass
class User:
    id: UUID
    name: str
    email: str
    password_hash: str
    created_at: datetime
    account_id: UUID | None = None
    account_name: str | None = None
    permissions: tuple[str, ...] = field(default_factory=tuple)
    role: str = "user"

    @classmethod
    def create(
        cls,
        name: str,
        email: str,
        password_hash: str,
        role: str = "user",
        account_id: UUID | None = None,
    ) -> "User":
        return cls(
            id=uuid4(),
            name=name,
            email=email,
            password_hash=password_hash,
            created_at=datetime.now(timezone.utc),
            account_id=account_id,
            role=role,
        )


@dataclass(frozen=True)
class UserOption:
    id: UUID
    name: str
    email: str
