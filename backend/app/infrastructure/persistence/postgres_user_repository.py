from datetime import datetime
from uuid import UUID

import asyncpg

from app.domain.entity.user import User
from app.domain.exceptions.user import UserAlreadyExistsError
from app.domain.repositories.user_repository import IUserRepository


class PostgresUserRepository(IUserRepository):
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def get_by_email(self, email: str) -> User | None:
        row = await self._pool.fetchrow(
            """
            SELECT u.id, u.name, u.email, u.password_hash, u.created_at,
                   COALESCE(
                       array_agg(DISTINCT p.code)
                           FILTER (WHERE p.code IS NOT NULL),
                       ARRAY[]::TEXT[]
                   ) AS permissions
            FROM users AS u
            LEFT JOIN user_roles AS ur ON ur.user_id = u.id
            LEFT JOIN role_permissions AS rp ON rp.role_id = ur.role_id
            LEFT JOIN permissions AS p ON p.code = rp.permission_code
            WHERE u.email = $1
            GROUP BY u.id
            """,
            email,
        )
        return self._to_entity(row) if row is not None else None

    async def add(self, user: User) -> User:
        try:
            async with self._pool.acquire() as connection:
                async with connection.transaction():
                    row = await connection.fetchrow(
                        """
                        INSERT INTO users (id, name, email, password_hash, created_at)
                        VALUES ($1, $2, $3, $4, $5)
                        RETURNING id, name, email, password_hash, created_at,
                                  ARRAY[]::TEXT[] AS permissions
                        """,
                        user.id,
                        user.name,
                        user.email,
                        user.password_hash,
                        user.created_at,
                    )
                    await connection.execute(
                        """
                        INSERT INTO user_roles (user_id, role_id)
                        SELECT $1, id FROM roles WHERE code = 'user'
                        ON CONFLICT DO NOTHING
                        """,
                        user.id,
                    )
        except asyncpg.UniqueViolationError as error:
            raise UserAlreadyExistsError(user.email) from error

        if row is None:
            raise RuntimeError("Database did not return the inserted user")
        return self._to_entity(row)

    async def store_password_reset_token(
        self, *, user_id: UUID, token_hash: str, expires_at: datetime
    ) -> None:
        await self._pool.execute(
            "DELETE FROM password_reset_tokens WHERE expires_at <= now()"
        )
        await self._pool.execute(
            """
            INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
            VALUES ($1, $2, $3)
            """,
            user_id,
            token_hash,
            expires_at,
        )

    async def reset_password(self, *, token_hash: str, password_hash: str) -> bool:
        async with self._pool.acquire() as connection:
            async with connection.transaction():
                token = await connection.fetchrow(
                    """
                    SELECT user_id
                    FROM password_reset_tokens
                    WHERE token_hash = $1 AND expires_at > now()
                    FOR UPDATE
                    """,
                    token_hash,
                )
                if token is None:
                    return False

                await connection.execute(
                    "UPDATE users SET password_hash = $2 WHERE id = $1",
                    token["user_id"],
                    password_hash,
                )
                await connection.execute(
                    "DELETE FROM password_reset_tokens WHERE user_id = $1",
                    token["user_id"],
                )
                await connection.execute(
                    """
                    UPDATE refresh_tokens
                    SET revoked_at = COALESCE(revoked_at, now())
                    WHERE user_id = $1
                    """,
                    token["user_id"],
                )
                return True

    @staticmethod
    def _to_entity(row: asyncpg.Record) -> User:
        return User(
            id=row["id"],
            name=row["name"],
            email=row["email"],
            password_hash=row["password_hash"],
            created_at=row["created_at"],
            permissions=tuple(row["permissions"] or ()),
        )
