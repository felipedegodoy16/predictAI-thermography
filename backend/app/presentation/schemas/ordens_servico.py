from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.domain.entity.ordem_servico import StatusOrdemServico


PrioridadeOrdemServico = Annotated[
    str,
    Field(pattern=r"^(BAIXA|MEDIA|ALTA|CRITICA)$"),
]


class ChecklistItemCreate(BaseModel):
    descricao: Annotated[str, Field(min_length=1)]
    obrigatorio: bool = True
    ordem: int = 0


class ChecklistItemUpdate(BaseModel):
    concluido: bool | None = None
    observacao_tecnico: str | None = None
    descricao: Annotated[str, Field(min_length=1)] | None = None
    obrigatorio: bool | None = None
    ordem: int | None = None


class ChecklistItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ordem_servico_id: int
    descricao: str
    obrigatorio: bool
    concluido: bool
    observacao_tecnico: str | None
    data_conclusao_item: datetime | None
    ordem: int


class OrdemServicoCreate(BaseModel):
    titulo: Annotated[str, Field(min_length=1, max_length=200)]
    descricao: Annotated[str, Field(min_length=1)]
    prioridade: PrioridadeOrdemServico
    cliente_id: UUID
    tecnico_id: UUID | None = None
    data_previsao: datetime | None = None
    checklist_itens: list[ChecklistItemCreate] = Field(default_factory=list)


class OrdemServicoUpdate(BaseModel):
    titulo: Annotated[str, Field(min_length=1, max_length=200)] | None = None
    descricao: Annotated[str, Field(min_length=1)] | None = None
    prioridade: PrioridadeOrdemServico | None = None
    cliente_id: UUID | None = None
    tecnico_id: UUID | None = None
    data_previsao: datetime | None = None


class OrdemServicoStatusUpdate(BaseModel):
    status: StatusOrdemServico
    justificativa: str | None = None


class OrdemServicoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    codigo_os: str
    titulo: str
    descricao: str
    status: StatusOrdemServico
    prioridade: str
    cliente_id: UUID
    tecnico_id: UUID | None
    data_criacao: datetime
    data_previsao: datetime | None
    data_conclusao: datetime | None
    observacao_status: str | None = None
    checklist_itens: list[ChecklistItemResponse] = Field(default_factory=list)

    @computed_field
    @property
    def progresso_checklist(self) -> float:
        if not self.checklist_itens:
            return 0.0
        concluidos = sum(item.concluido for item in self.checklist_itens)
        return round(concluidos * 100 / len(self.checklist_itens), 2)


class KanbanBoardResponse(BaseModel):
    colunas: dict[StatusOrdemServico, list[OrdemServicoResponse]]
