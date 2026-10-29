from typing import Annotated

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.domain.entity.equipment import EquipmentType
from app.infrastructure.persistence.postgres_equipment_repository import (
    PostgresEquipmentRepository,
)
from app.presentation.http.dependencies import (
    AuthenticatedUser,
    get_current_user,
    get_equipment_repository,
)
from app.presentation.schemas.equipment import (
    EquipmentCreate,
    EquipmentResponse,
    equipment_type_options,
)

router = APIRouter()
CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
Repository = Annotated[
    PostgresEquipmentRepository, Depends(get_equipment_repository)
]


@router.get("/tipos", summary="Listar tipos de equipamento")
async def list_equipment_types(_: CurrentUser):
    return equipment_type_options()


@router.post(
    "",
    response_model=EquipmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar equipamento",
)
async def create_equipment(
    payload: EquipmentCreate, _: CurrentUser, repository: Repository
) -> EquipmentResponse:
    try:
        created = await repository.create(
            payload.model_dump(by_alias=False)
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um equipamento com este código patrimonial.",
        ) from None
    return EquipmentResponse.model_validate(created)


@router.get(
    "",
    response_model=list[EquipmentResponse],
    summary="Listar equipamentos",
)
async def list_equipments(
    _: CurrentUser,
    repository: Repository,
    equipment_type: EquipmentType | None = Query(default=None, alias="tipo"),
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[EquipmentResponse]:
    rows = await repository.list(
        equipment_type=equipment_type.value if equipment_type else None,
        limit=limit,
        offset=offset,
    )
    return [EquipmentResponse.model_validate(row) for row in rows]
