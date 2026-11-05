import asyncio
from threading import Lock
from typing import ClassVar

import asyncpg


class Database:
    """Own one asyncpg pool; the configured production instance is a Singleton."""

    _instance: ClassVar["Database | None"] = None
    _instance_lock: ClassVar[Lock] = Lock()

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

    @classmethod
    def get_instance(
        cls,
        database_url: str,
        *,
        min_pool_size: int = 1,
        max_pool_size: int = 10,
    ) -> "Database":
        """Return the process-wide production database owner.

        The synchronous lock makes first construction safe if application setup
        is triggered from multiple threads. An existing Singleton cannot be
        rebound to another database configuration in the same process.
        """
        configuration = (database_url, min_pool_size, max_pool_size)
        with cls._instance_lock:
            if cls._instance is None:
                cls._instance = cls(
                    database_url,
                    min_pool_size=min_pool_size,
                    max_pool_size=max_pool_size,
                )
            elif (
                cls._instance.database_url,
                cls._instance.min_pool_size,
                cls._instance.max_pool_size,
            ) != configuration:
                raise RuntimeError(
                    "The process-wide Database Singleton is already configured "
                    "with different database settings. Inject a Database instance "
                    "explicitly when creating an isolated application."
                )
            return cls._instance

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
            if self.pool is not None:
                pool = self.pool
                await pool.close()
                self.pool = None

    def get_pool(self) -> asyncpg.Pool:
        if self.pool is None:
            raise RuntimeError("Database pool is not initialized.")

        return self.pool
