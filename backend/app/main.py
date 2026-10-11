from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.domain.exceptions.user import UserAlreadyExistsError
from app.infrastructure.database.postgres import Database


def create_app(database: Database | None = None) -> FastAPI:
    db = database or Database(
        settings.database_dsn,
        min_pool_size=settings.database_min_pool_size,
        max_pool_size=settings.database_max_pool_size,
    )

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        await db.connect()
        try:
            yield
        finally:
            await db.disconnect()

    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
    )
    application.state.database = db
    application.include_router(api_router, prefix="/api/v1")

    @application.exception_handler(UserAlreadyExistsError)
    async def user_already_exists_handler(
        _: Request,
        error: UserAlreadyExistsError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={"detail": "A user with this email already exists."},
        )

    @application.get("/", tags=["health"])
    async def healthcheck() -> dict[str, str]:
        return {"status": "ok", "service": settings.app_name}

    return application


app = create_app()
