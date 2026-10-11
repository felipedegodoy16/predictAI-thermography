from fastapi import APIRouter

from app.presentation.http.auth import router as auth_router
from app.presentation.http.ordens_servico import router as ordens_servico_router
from app.presentation.http.users import router as users_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["authentication"])
api_router.include_router(users_router, prefix="/users", tags=["users"])
api_router.include_router(
    ordens_servico_router,
    prefix="/ordens-servico",
    tags=["Ordens de Serviço"],
)
