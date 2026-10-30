from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class ThermographicRegionMeasurementRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    x: Annotated[float, Field(ge=0, allow_inf_nan=False)]
    y: Annotated[float, Field(ge=0, allow_inf_nan=False)]
    width: Annotated[float, Field(gt=0, allow_inf_nan=False)] = Field(alias="largura")
    height: Annotated[float, Field(gt=0, allow_inf_nan=False)] = Field(alias="altura")


class ThermographicRegionMeasurementResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    minimum: float = Field(alias="temperatura_minima_c")
    maximum: float = Field(alias="temperatura_maxima_c")
    mean: float = Field(alias="temperatura_media_c")
    thermal_pixels: int = Field(alias="pixels_termicos")
    thermal_coverage_percent: float = Field(alias="cobertura_termica_percentual")
