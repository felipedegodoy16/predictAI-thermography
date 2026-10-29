from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.entity.equipment import EQUIPMENT_TYPE_OPTIONS, EquipmentType


EquipmentCriticality = Literal["BAIXA", "MEDIA", "ALTA", "CRITICA"]


class EquipmentFieldOption(BaseModel):
    key: str
    label: str
    unit: str


class EquipmentTypeOption(BaseModel):
    equipment_type: EquipmentType = Field(alias="tipo")
    label: str
    fields: list[EquipmentFieldOption] = Field(alias="campos")

    model_config = ConfigDict(populate_by_name=True)


def equipment_type_options() -> list[EquipmentTypeOption]:
    return [
        EquipmentTypeOption(
            equipment_type=equipment_type,
            label=configuration["label"],
            fields=configuration["fields"],
        )
        for equipment_type, configuration in EQUIPMENT_TYPE_OPTIONS.items()
    ]


class EquipmentCreate(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        str_strip_whitespace=True,
        extra="forbid",
    )

    name: Annotated[str, Field(min_length=2, max_length=200)] = Field(alias="nome")
    equipment_type: EquipmentType = Field(alias="tipo")
    manufacturer: str | None = Field(default=None, max_length=120, alias="fabricante")
    model: str | None = Field(default=None, max_length=120, alias="modelo")
    serial_number: str | None = Field(default=None, max_length=120, alias="numero_serie")
    asset_tag: str | None = Field(default=None, max_length=80, alias="patrimonio")
    location: str | None = Field(default=None, max_length=200, alias="localizacao")
    criticality: EquipmentCriticality = Field(default="MEDIA", alias="criticidade")
    installation_date: date | None = Field(default=None, alias="data_instalacao")
    notes: str | None = Field(default=None, max_length=2000, alias="observacoes")
    specifications: dict[str, float] = Field(default_factory=dict, alias="especificacoes")

    @model_validator(mode="after")
    def validate_specifications(self) -> "EquipmentCreate":
        allowed = {
            field["key"]
            for field in EQUIPMENT_TYPE_OPTIONS[self.equipment_type]["fields"]
        }
        unsupported = set(self.specifications) - allowed
        if unsupported:
            raise ValueError(
                "Especificações não pertencem ao tipo selecionado: "
                + ", ".join(sorted(unsupported))
            )
        for key, value in self.specifications.items():
            if value <= 0:
                raise ValueError(f"A especificação '{key}' deve ser maior que zero.")
            if key == "phase_count" and not value.is_integer():
                raise ValueError("O número de fases deve ser inteiro.")
        return self


class EquipmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    code: str = Field(alias="codigo")
    name: str = Field(alias="nome")
    equipment_type: EquipmentType = Field(alias="tipo")
    manufacturer: str | None = Field(alias="fabricante")
    model: str | None = Field(alias="modelo")
    serial_number: str | None = Field(alias="numero_serie")
    asset_tag: str | None = Field(alias="patrimonio")
    location: str | None = Field(alias="localizacao")
    criticality: EquipmentCriticality = Field(alias="criticidade")
    installation_date: date | None = Field(alias="data_instalacao")
    notes: str | None = Field(alias="observacoes")
    specifications: dict[str, float] = Field(alias="especificacoes")
    created_at: datetime = Field(alias="data_cadastro")
