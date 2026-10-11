from datetime import datetime, timezone
from uuid import UUID, uuid4

import asyncpg

from app.domain.entity.user import User
from app.infrastructure.persistence.postgres_user_repository import (
    PostgresUserRepository,
)


class PostgresRefreshTokenRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def create(
        self,
        *,
        user_id: UUID,
        family_id: UUID,
        token_hash: str,
        expires_at: datetime,
    ) -> None:
        await self._pool.execute(
            """
            INSERT INTO refresh_tokens (id, user_id, family_id, token_hash, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            """,
            uuid4(),
            user_id,
            family_id,
            token_hash,
            expires_at,
        )

    async def rotate(
        self,
        *,
        token_hash: str,
        replacement_hash: str,
        replacement_expires_at: datetime,
    ) -> User | None:
        async with self._pool.acquire() as connection:
            async with connection.transaction():
                token_row = await connection.fetchrow(
                    """
                    SELECT id, user_id, family_id, expires_at, revoked_at
                    FROM refresh_tokens
                    WHERE token_hash = $1
                    FOR UPDATE
                    """,
                    token_hash,
                )
                if token_row is None:
                    return None

                if token_row["revoked_at"] is not None:
                    await connection.execute(
                        """
                        UPDATE refresh_tokens
                        SET revoked_at = COALESCE(revoked_at, now())
                        WHERE family_id = $1
                        """,
                        token_row["family_id"],
                    )
                    return None

                now = datetime.now(timezone.utc)
                if token_row["expires_at"] <= now:
                    await connection.execute(
                        "UPDATE refresh_tokens SET revoked_at = now() WHERE family_id = $1",
                        token_row["family_id"],
                    )
                    return None

                user_row = await connection.fetchrow(
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
                    WHERE u.id = $1
                    GROUP BY u.id
                    """,
                    token_row["user_id"],
                )
                if user_row is None:
                    await connection.execute(
                        "UPDATE refresh_tokens SET revoked_at = now() WHERE family_id = $1",
                        token_row["family_id"],
                    )
                    return None

                await connection.execute(
                    "UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1",
                    token_row["id"],
                )
                await connection.execute(
                    """
                    INSERT INTO refresh_tokens (id, user_id, family_id, token_hash, expires_at)
                    VALUES ($1, $2, $3, $4, $5)
                    """,
                    uuid4(),
                    token_row["user_id"],
                    token_row["family_id"],
                    replacement_hash,
                    replacement_expires_at,
                )

                return PostgresUserRepository._to_entity(user_row)
