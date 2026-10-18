from datetime import datetime
from uuid import UUID

import asyncpg

from app.domain.entity.user import User, UserOption
from app.domain.exceptions.user import UserAlreadyExistsError
from app.domain.repositories.user_repository import IUserRepository


class PostgresUserRepository(IUserRepository):
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def get_by_email(self, email: str) -> User | None:
        row = await self._pool.fetchrow(
            """
            SELECT u.id, u.name, u.email, u.password_hash, u.created_at,
                   COALESCE((SELECT r.code FROM user_roles ur2 JOIN roles r ON r.id = ur2.role_id WHERE ur2.user_id = u.id LIMIT 1), 'user') AS role,
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

    async def get_by_id(self, user_id: UUID) -> User | None:
        row = await self._pool.fetchrow(
            """
            SELECT u.id, u.name, u.email, u.password_hash, u.created_at,
                   COALESCE((SELECT r.code FROM user_roles ur2 JOIN roles r ON r.id = ur2.role_id WHERE ur2.user_id = u.id LIMIT 1), 'user') AS role,
                   COALESCE(array_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL), ARRAY[]::TEXT[]) AS permissions
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN role_permissions rp ON rp.role_id = ur.role_id
            LEFT JOIN permissions p ON p.code = rp.permission_code
            WHERE u.id = $1
            GROUP BY u.id
            """,
            user_id,
        )
        return self._to_entity(row) if row is not None else None

    async def list_users(
        self, *, limit: int, offset: int, query: str | None = None
    ) -> list[User]:
        rows = await self._pool.fetch(
            """
            SELECT u.id, u.name, u.email, u.password_hash, u.created_at,
                   COALESCE((SELECT r.code FROM user_roles ur2 JOIN roles r ON r.id = ur2.role_id WHERE ur2.user_id = u.id LIMIT 1), 'user') AS role,
                   COALESCE(
                       array_agg(DISTINCT p.code)
                           FILTER (WHERE p.code IS NOT NULL),
                       ARRAY[]::TEXT[]
                   ) AS permissions
            FROM users AS u
            LEFT JOIN user_roles AS ur ON ur.user_id = u.id
            LEFT JOIN role_permissions AS rp ON rp.role_id = ur.role_id
            LEFT JOIN permissions AS p ON p.code = rp.permission_code
            WHERE $1::TEXT IS NULL
               OR u.name ILIKE '%' || $1 || '%'
               OR u.email ILIKE '%' || $1 || '%'
            GROUP BY u.id
            ORDER BY u.created_at DESC, u.id
            LIMIT $2 OFFSET $3
            """,
            query,
            limit,
            offset,
        )
        return [self._to_entity(row) for row in rows]

    async def list_user_options(self) -> list[UserOption]:
        rows = await self._pool.fetch(
            "SELECT id, name, email FROM users ORDER BY name, email"
        )
        return [
            UserOption(id=row["id"], name=row["name"], email=row["email"])
            for row in rows
        ]

    async def update_profile(
        self, *, user_id: UUID, name: str | None, email: str | None,
        role: str | None = None,
    ) -> User | None:
        try:
            async with self._pool.acquire() as connection:
                async with connection.transaction():
                    updated = await connection.fetchrow(
                        "UPDATE users SET name = COALESCE($2, name), email = COALESCE($3, email) WHERE id = $1 RETURNING id",
                        user_id, name, email,
                    )
                    if updated is None:
                        return None
                    if role is not None:
                        await connection.execute("DELETE FROM user_roles WHERE user_id = $1", user_id)
                        await connection.execute(
                            "INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE code = $2",
                            user_id, role,
                        )
                    row = await connection.fetchrow(
                        """
                        SELECT u.id, u.name, u.email, u.password_hash, u.created_at,
                               COALESCE((SELECT r.code FROM user_roles ur2 JOIN roles r ON r.id = ur2.role_id WHERE ur2.user_id = u.id LIMIT 1), 'user') AS role,
                               COALESCE(array_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL), ARRAY[]::TEXT[]) AS permissions
                        FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id
                        LEFT JOIN role_permissions rp ON rp.role_id = ur.role_id
                        LEFT JOIN permissions p ON p.code = rp.permission_code
                        WHERE u.id = $1 GROUP BY u.id
                        """,
                        user_id,
                    )
        except asyncpg.UniqueViolationError as error:
            raise UserAlreadyExistsError(email or "") from error
        return self._to_entity(row) if row is not None else None

    async def delete(self, *, user_id: UUID) -> bool:
        result = await self._pool.execute("DELETE FROM users WHERE id = $1", user_id)
        return result != "DELETE 0"

    async def add(self, user: User) -> User:
        try:
            async with self._pool.acquire() as connection:
                async with connection.transaction():
                    row = await connection.fetchrow(
                        """
                        INSERT INTO users (id, name, email, password_hash, created_at)
                        VALUES ($1, $2, $3, $4, $5)
                        RETURNING id, name, email, password_hash, created_at,
                                  $6::TEXT AS role, ARRAY[]::TEXT[] AS permissions
                        """,
                        user.id,
                        user.name,
                        user.email,
                        user.password_hash,
                        user.created_at,
                        user.role,
                    )
                    await connection.execute(
                        """
                        INSERT INTO user_roles (user_id, role_id)
                        SELECT $1, id FROM roles WHERE code = $2
                        ON CONFLICT DO NOTHING
                        """,
                        user.id,
                        user.role,
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
            role=row["role"],
        )
