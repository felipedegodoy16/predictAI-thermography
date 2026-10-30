from pydantic import BaseModel, ConfigDict, Field

from app.domain.entity.service_order import ServiceOrderPriority, ServiceOrderStatus


class DashboardThermalAlertEquipment(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    equipment_id: int = Field(alias="equipamento_id")
    equipment_code: str = Field(alias="codigo_equipamento")
    equipment_name: str = Field(alias="nome_equipamento")
    red_alert_images: int = Field(alias="imagens_alerta_vermelho")
    yellow_alert_images: int = Field(alias="imagens_alerta_amarelo")


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
