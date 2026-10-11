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
    permissions: tuple[str, ...] = field(default_factory=tuple)

    @classmethod
    def create(
        cls,
        name: str,
        email: str,
        password_hash: str,
    ) -> "User":
        return cls(
            id=uuid4(),
            name=name,
            email=email,
            password_hash=password_hash,
            created_at=datetime.now(timezone.utc),
        )
