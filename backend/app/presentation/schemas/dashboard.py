from pydantic import BaseModel, ConfigDict, Field

from app.domain.entity.service_order import ServiceOrderPriority, ServiceOrderStatus


class DashboardMonthActivity(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    month: str = Field(alias="mes")
    opened: int = Field(alias="abertas")
    completed: int = Field(alias="concluidas")


class DashboardSummaryResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    open_orders: int = Field(alias="os_abertas")
    closed_orders: int = Field(alias="os_fechadas")
    completed_orders: int = Field(alias="os_concluidas")
    cancelled_orders: int = Field(alias="os_canceladas")
    overdue_orders: int = Field(alias="os_atrasadas")
    by_status: dict[ServiceOrderStatus, int] = Field(alias="por_status")
    by_priority: dict[ServiceOrderPriority, int] = Field(alias="por_prioridade")
    monthly_activity: list[DashboardMonthActivity] = Field(alias="atividade_mensal")
