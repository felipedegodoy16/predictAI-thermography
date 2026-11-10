from uuid import UUID, uuid4

import asyncpg

from app.domain.entity.account import Account
from app.domain.repositories.account_repository import IAccountRepository


class PostgresAccountRepository(IAccountRepository):
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def create_with_admin(
        self,
        *,
        name: str,
        slug: str,
        admin_name: str,
        admin_email: str,
        admin_password_hash: str,
    ) -> tuple[Account, UUID]:
        async with self._pool.acquire() as conn, conn.transaction():
            account_row = await conn.fetchrow(
                "INSERT INTO accounts(name, slug) VALUES ($1, $2) RETURNING *",
                name, slug,
            )
            user_id = uuid4()
            user_row = await conn.fetchrow(
                """INSERT INTO users(
                       id, name, email, password_hash, account_id, created_at,
                       email_on_thermal_alarm
                   )
                   VALUES ($1, $2, $3, $4, $5, NOW(), TRUE) RETURNING id""",
                user_id, admin_name, admin_email, admin_password_hash, account_row["id"],
            )
            await conn.execute(
                "INSERT INTO user_roles(user_id, role_id) SELECT $1, id FROM roles WHERE code='admin'",
                user_row["id"],
            )
        return self._to_account(account_row), user_row["id"]

    async def list_accounts(self) -> list[Account]:
        rows = await self._pool.fetch(
            """SELECT a.*, COUNT(DISTINCT u.id)::INTEGER AS user_count,
                      COUNT(DISTINCT e.id)::INTEGER AS equipment_count
               FROM accounts a
               LEFT JOIN users u ON u.account_id = a.id
               LEFT JOIN equipment e ON e.account_id = a.id
               GROUP BY a.id ORDER BY a.created_at DESC, a.name"""
        )
        return [self._to_account(row) for row in rows]

    async def get_by_id(self, account_id: UUID) -> Account | None:
        row = await self._pool.fetchrow(
            "SELECT * FROM accounts WHERE id = $1", account_id
        )
        return self._to_account(row) if row else None

    @staticmethod
    def _to_account(row: asyncpg.Record) -> Account:
        return Account(
            id=row["id"],
            name=row["name"],
            slug=row["slug"],
            is_active=row["is_active"],
            created_at=row["created_at"],
            user_count=row["user_count"] if "user_count" in row.keys() else 0,
            equipment_count=row["equipment_count"] if "equipment_count" in row.keys() else 0,
        )
