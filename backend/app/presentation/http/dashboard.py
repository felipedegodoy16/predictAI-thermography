from typing import Annotated

from fastapi import APIRouter, Depends

from app.infrastructure.persistence.postgres_dashboard_repository import (
    PostgresDashboardRepository,
)
from app.presentation.http.dependencies import (
    AuthenticatedUser,
    get_current_user,
    get_dashboard_repository,
)
from app.presentation.schemas.dashboard import (
    DashboardSummaryResponse,
    DashboardThermalAlertEquipment,
)

router = APIRouter()
CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
Repository = Annotated[
    PostgresDashboardRepository, Depends(get_dashboard_repository)
]


@router.get(
    "/alertas-termicos",
    response_model=list[DashboardThermalAlertEquipment],
    summary="Listar equipamentos com imagens em alerta térmico",
)
async def get_dashboard_thermal_alerts(
    _: CurrentUser, repository: Repository
) -> list[DashboardThermalAlertEquipment]:
    rows = await repository.thermal_alerts()
    return [DashboardThermalAlertEquipment.model_validate(row) for row in rows]


@router.get(
    "/resumo",
    response_model=DashboardSummaryResponse,
    summary="Obter indicadores do dashboard",
)
async def get_dashboard_summary(
    _: CurrentUser, repository: Repository
) -> DashboardSummaryResponse:
    return DashboardSummaryResponse.model_validate(await repository.summary())
