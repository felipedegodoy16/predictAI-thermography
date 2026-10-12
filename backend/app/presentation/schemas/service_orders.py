from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.domain.entity.service_order import ServiceOrderStatus


ServiceOrderPriority = Annotated[
    str,
    Field(pattern=r"^(BAIXA|MEDIA|ALTA|CRITICA)$"),
]


class ChecklistItemCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    description: Annotated[str, Field(min_length=1)] = Field(alias="descricao")
    required: bool = Field(default=True, alias="obrigatorio")
    sort_order: int = Field(default=0, alias="ordem")


class ChecklistItemUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    completed: bool | None = Field(default=None, alias="concluido")
    technician_note: str | None = Field(default=None, alias="observacao_tecnico")
    description: Annotated[str, Field(min_length=1)] | None = Field(
        default=None, alias="descricao"
    )
    required: bool | None = Field(default=None, alias="obrigatorio")
    sort_order: int | None = Field(default=None, alias="ordem")


class ChecklistItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    service_order_id: int = Field(alias="ordem_servico_id")
    description: str = Field(alias="descricao")
    required: bool = Field(alias="obrigatorio")
    completed: bool = Field(alias="concluido")
    technician_note: str | None = Field(alias="observacao_tecnico")
    item_completed_at: datetime | None = Field(alias="data_conclusao_item")
    sort_order: int = Field(alias="ordem")


class ServiceOrderCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: Annotated[str, Field(min_length=1, max_length=200)] = Field(alias="titulo")
    description: Annotated[str, Field(min_length=1)] = Field(alias="descricao")
    priority: ServiceOrderPriority = Field(alias="prioridade")
    client_id: UUID = Field(alias="cliente_id")
    technician_id: UUID | None = Field(default=None, alias="tecnico_id")
    due_at: datetime | None = Field(default=None, alias="data_previsao")
    checklist_items: list[ChecklistItemCreate] = Field(default_factory=list, alias="checklist_itens")


class ServiceOrderUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: Annotated[str, Field(min_length=1, max_length=200)] | None = Field(
        default=None, alias="titulo"
    )
    description: Annotated[str, Field(min_length=1)] | None = Field(
        default=None, alias="descricao"
    )
    priority: ServiceOrderPriority | None = Field(default=None, alias="prioridade")
    client_id: UUID | None = Field(default=None, alias="cliente_id")
    technician_id: UUID | None = Field(default=None, alias="tecnico_id")
    due_at: datetime | None = Field(default=None, alias="data_previsao")


class ServiceOrderStatusUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    status: ServiceOrderStatus
    reason: str | None = Field(default=None, alias="justificativa")


class ServiceOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    code: str = Field(alias="codigo_os")
    title: str = Field(alias="titulo")
    description: str = Field(alias="descricao")
    status: ServiceOrderStatus
    priority: str = Field(alias="prioridade")
    client_id: UUID = Field(alias="cliente_id")
    technician_id: UUID | None = Field(alias="tecnico_id")
    created_at: datetime = Field(alias="data_criacao")
    due_at: datetime | None = Field(alias="data_previsao")
    completed_at: datetime | None = Field(alias="data_conclusao")
    status_note: str | None = Field(default=None, alias="observacao_status")
    checklist_items: list[ChecklistItemResponse] = Field(default_factory=list, alias="checklist_itens")

    @computed_field(alias="progresso_checklist")
    @property
    def checklist_progress(self) -> float:
        if not self.checklist_items:
            return 0.0
        completed_count = sum(item.completed for item in self.checklist_items)
        return round(completed_count * 100 / len(self.checklist_items), 2)


class KanbanBoardResponse(BaseModel):
    columns: dict[ServiceOrderStatus, list[ServiceOrderResponse]] = Field(alias="colunas")
