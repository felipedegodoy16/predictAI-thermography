from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field


class EquipmentAdviceRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, str_strip_whitespace=True)

    problem: Annotated[str, Field(min_length=5, max_length=4000)] = Field(alias="problema")


class EquipmentAdviceChecklistItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    description: Annotated[str, Field(min_length=1, max_length=500)] = Field(alias="descricao")
    required: bool = Field(default=True, alias="obrigatorio")


class EquipmentAdviceResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: Annotated[str, Field(min_length=3, max_length=200)] = Field(alias="titulo")
    description: Annotated[str, Field(min_length=1, max_length=10000)] = Field(alias="descricao")
    priority: Literal["BAIXA", "MEDIA", "ALTA", "CRITICA"] = Field(alias="prioridade")
    checklist: Annotated[list[EquipmentAdviceChecklistItem], Field(min_length=1, max_length=20)] = Field(alias="checklist_itens")
