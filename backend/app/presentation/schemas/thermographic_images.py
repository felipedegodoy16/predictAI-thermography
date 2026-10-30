from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ThermographicImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    equipment_id: int = Field(alias="equipamento_id")
    equipment_name: str = Field(alias="nome_equipamento")
    original_file_name: str = Field(alias="arquivo_original")
    temperature_matrix_file_name: str = Field(alias="matriz_temperatura")
    visible_image_file_name: str = Field(alias="imagem_normal")
    thermal_image_file_name: str = Field(alias="imagem_termica")
    thermal_overlay_file_name: str | None = Field(default=None, alias="sobreposicao_termica")
    metadata_file_name: str = Field(alias="arquivo_metadados")
    analysis_metadata: dict[str, Any] = Field(alias="metadados")
    created_at: datetime = Field(alias="data_criacao")
