import asyncpg


class Database:
    """Application-scoped owner of the shared asyncpg connection pool."""

    def __init__(
        self,
        database_url: str,
        *,
        min_pool_size: int = 1,
        max_pool_size: int = 10,
    ) -> None:
        self.database_url = database_url
        self.min_pool_size = min_pool_size
        self.max_pool_size = max_pool_size
        self.pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        if self.pool is not None:
            return
        self.pool = await asyncpg.create_pool(
            dsn=self.database_url,
            min_size=self.min_pool_size,
            max_size=self.max_pool_size,
            command_timeout=30,
        )

    async def disconnect(self) -> None:
        if self.pool is not None:
            await self.pool.close()
            self.pool = None

    def get_pool(self) -> asyncpg.Pool:
        if self.pool is None:
            raise RuntimeError("Database pool is not initialized.")

        return self.pool
