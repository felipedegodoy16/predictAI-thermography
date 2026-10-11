from fastapi import APIRouter

from app.presentation.http.auth import router as auth_router
from app.presentation.http.service_orders import router as service_orders_router
from app.presentation.http.users import router as users_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["authentication"])
api_router.include_router(users_router, prefix="/users", tags=["users"])
api_router.include_router(
    service_orders_router,
    prefix="/ordens-servico",
    tags=["Ordens de Serviço"],
)
