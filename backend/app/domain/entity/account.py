from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True)
class Account:
    id: UUID
    name: str
    slug: str
    is_active: bool
    created_at: datetime
    user_count: int = 0
    equipment_count: int = 0
