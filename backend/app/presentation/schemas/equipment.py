from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.entity.equipment import EQUIPMENT_TYPE_OPTIONS, EquipmentType


EquipmentCriticality = Literal["BAIXA", "MEDIA", "ALTA", "CRITICA"]


class EquipmentTypeOption(BaseModel):
    equipment_type: EquipmentType = Field(alias="tipo")
    label: str

    model_config = ConfigDict(populate_by_name=True)


def equipment_type_options() -> list[EquipmentTypeOption]:
    return [
        EquipmentTypeOption(
            equipment_type=equipment_type,
            label=configuration["label"],
        )
        for equipment_type, configuration in EQUIPMENT_TYPE_OPTIONS.items()
    ]


class EquipmentCreate(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        str_strip_whitespace=True,
        extra="forbid",
    )

    name: Annotated[str, Field(max_length=200)] = Field(default="", alias="nome")
    equipment_type: EquipmentType = Field(alias="tipo")
    manufacturer: Annotated[str, Field(min_length=1, max_length=120)] = Field(alias="fabricante")
    yellow_limit_c: float = Field(alias="limite_amarelo_c", allow_inf_nan=False)
    red_limit_c: float = Field(alias="limite_vermelho_c", allow_inf_nan=False)
    model: str | None = Field(default=None, max_length=120, alias="modelo")
    serial_number: str | None = Field(default=None, max_length=120, alias="numero_serie")
    asset_tag: str | None = Field(default=None, max_length=80, alias="patrimonio")
    location: str | None = Field(default=None, max_length=200, alias="localizacao")
    criticality: EquipmentCriticality = Field(default="MEDIA", alias="criticidade")
    installation_date: date | None = Field(default=None, alias="data_instalacao")
    notes: str | None = Field(default=None, max_length=2000, alias="observacoes")

    @model_validator(mode="after")
    def validate_equipment(self) -> "EquipmentCreate":
        if self.red_limit_c <= self.yellow_limit_c:
            raise ValueError("O limite vermelho deve ser maior que o limite amarelo.")
        if self.name and len(self.name) < 2:
            raise ValueError("A identificação deve ter pelo menos 2 caracteres.")
        if not self.name:
            self.name = f"{self.manufacturer} · {EQUIPMENT_TYPE_OPTIONS[self.equipment_type]['label']}"
        return self


class EquipmentUpdate(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        str_strip_whitespace=True,
        extra="forbid",
    )

    name: Annotated[str, Field(max_length=200)] | None = Field(default=None, alias="nome")
    equipment_type: EquipmentType | None = Field(default=None, alias="tipo")
    manufacturer: Annotated[str, Field(min_length=1, max_length=120)] | None = Field(default=None, alias="fabricante")
    yellow_limit_c: float | None = Field(default=None, alias="limite_amarelo_c", allow_inf_nan=False)
    red_limit_c: float | None = Field(default=None, alias="limite_vermelho_c", allow_inf_nan=False)
    model: Annotated[str, Field(max_length=120)] | None = Field(default=None, alias="modelo")
    serial_number: Annotated[str, Field(max_length=120)] | None = Field(default=None, alias="numero_serie")
    asset_tag: Annotated[str, Field(max_length=80)] | None = Field(default=None, alias="patrimonio")
    location: Annotated[str, Field(max_length=200)] | None = Field(default=None, alias="localizacao")
    criticality: EquipmentCriticality | None = Field(default=None, alias="criticidade")
    installation_date: date | None = Field(default=None, alias="data_instalacao")
    notes: Annotated[str, Field(max_length=2000)] | None = Field(default=None, alias="observacoes")


class EquipmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    code: str = Field(alias="codigo")
    name: str = Field(alias="nome")
    equipment_type: EquipmentType = Field(alias="tipo")
    manufacturer: str | None = Field(alias="fabricante")
    yellow_limit_c: float | None = Field(default=None, alias="limite_amarelo_c")
    red_limit_c: float | None = Field(default=None, alias="limite_vermelho_c")
    model: str | None = Field(alias="modelo")
    serial_number: str | None = Field(alias="numero_serie")
    asset_tag: str | None = Field(alias="patrimonio")
    location: str | None = Field(alias="localizacao")
    criticality: EquipmentCriticality = Field(alias="criticidade")
    installation_date: date | None = Field(alias="data_instalacao")
    notes: str | None = Field(alias="observacoes")
    manual_file_name: str | None = Field(alias="manual_nome_arquivo")
    created_at: datetime = Field(alias="data_cadastro")
