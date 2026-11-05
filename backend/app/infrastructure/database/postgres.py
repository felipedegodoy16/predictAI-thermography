import asyncio

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
        self._lifecycle_lock = asyncio.Lock()

    async def connect(self) -> None:
        async with self._lifecycle_lock:
            if self.pool is not None:
                return
            pool = await asyncpg.create_pool(
                dsn=self.database_url,
                min_size=self.min_pool_size,
                max_size=self.max_pool_size,
                command_timeout=30,
            )
            self.pool = pool

    async def disconnect(self) -> None:
        async with self._lifecycle_lock:
            if self.pool is None:
                return
            pool = self.pool
            try:
                await pool.close()
            finally:
                self.pool = None

    def get_pool(self) -> asyncpg.Pool:
        if self.pool is None:
            raise RuntimeError("Database pool is not initialized.")

        return self.pool
