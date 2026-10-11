from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.domain.entity.service_order import ServiceOrderStatus
from app.infrastructure.persistence.postgres_service_order_repository import (
    PostgresServiceOrderRepository,
)
from app.presentation.http.dependencies import (
    AuthenticatedUser,
    get_current_user,
    get_service_order_repository,
)
from app.presentation.schemas.service_orders import (
    ChecklistItemCreate,
    ChecklistItemResponse,
    ChecklistItemUpdate,
    KanbanBoardResponse,
    ServiceOrderCreate,
    ServiceOrderResponse,
    ServiceOrderStatusUpdate,
    ServiceOrderUpdate,
)

router = APIRouter()
CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
Repository = Annotated[
    PostgresServiceOrderRepository, Depends(get_service_order_repository)
]


@router.post(
    "/",
    response_model=ServiceOrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar ordem de serviço",
    description="Cria uma OS e, opcionalmente, seus itens iniciais de checklist.",
)
async def create_service_order(
    payload: ServiceOrderCreate, _: CurrentUser, repo: Repository
) -> ServiceOrderResponse:
    try:
        return ServiceOrderResponse.model_validate(
            await repo.create(payload.model_dump())
        )
    except Exception as error:
        _raise_database_error(error)


@router.get(
    "/kanban",
    response_model=KanbanBoardResponse,
    summary="Obter quadro Kanban",
    description="Retorna as ordens agrupadas por status.",
)
async def get_kanban_board(_: CurrentUser, repo: Repository) -> KanbanBoardResponse:
    board = await repo.kanban()
    return KanbanBoardResponse(
        columns={key: [ServiceOrderResponse.model_validate(item) for item in items]
                 for key, items in board.items()}
    )


@router.get(
    "/",
    response_model=list[ServiceOrderResponse],
    summary="Listar ordens de serviço",
    description="Lista OSs com filtros e paginação.",
)
async def list_service_orders(
    _: CurrentUser,
    repo: Repository,
    status_filter: Annotated[ServiceOrderStatus | None, Query(alias="status")] = None,
    technician_id: UUID | None = Query(default=None, alias="tecnico_id"),
    priority: str | None = Query(default=None, pattern=r"^(BAIXA|MEDIA|ALTA|CRITICA)$"),
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[ServiceOrderResponse]:
    rows = await repo.list(
        status=status_filter, technician_id=technician_id, priority=priority,
        skip=skip, limit=limit,
    )
    return [ServiceOrderResponse.model_validate(row) for row in rows]


@router.get(
    "/{service_order_id}",
    response_model=ServiceOrderResponse,
    summary="Obter ordem de serviço",
    description="Retorna os dados completos da OS e seu checklist ordenado.",
)
async def get_service_order(
    service_order_id: int, _: CurrentUser, repo: Repository
) -> ServiceOrderResponse:
    row = await repo.get(service_order_id)
    if row is None:
        raise _not_found("Ordem de serviço não encontrada.")
    return ServiceOrderResponse.model_validate(row)


@router.patch(
    "/{service_order_id}/status",
    response_model=ServiceOrderResponse,
    summary="Mover ordem no Kanban",
    description="Atualiza o status e valida os itens obrigatórios antes da conclusão.",
)
async def update_status(
    service_order_id: int,
    payload: ServiceOrderStatusUpdate,
    _: CurrentUser,
    repo: Repository,
) -> ServiceOrderResponse:
    try:
        row = await repo.update_status(service_order_id, payload.status, payload.reason)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    if row is None:
        raise _not_found("Ordem de serviço não encontrada.")
    return ServiceOrderResponse.model_validate(row)


@router.put(
    "/{service_order_id}",
    response_model=ServiceOrderResponse,
    summary="Atualizar ordem de serviço",
    description="Atualiza os dados gerais de uma OS.",
)
async def update_service_order(
    service_order_id: int,
    payload: ServiceOrderUpdate,
    _: CurrentUser,
    repo: Repository,
) -> ServiceOrderResponse:
    try:
        row = await repo.update(service_order_id, payload.model_dump(exclude_unset=True))
    except Exception as error:
        _raise_database_error(error)
    if row is None:
        raise _not_found("Ordem de serviço não encontrada.")
    return ServiceOrderResponse.model_validate(row)


@router.post(
    "/{service_order_id}/checklist",
    response_model=ServiceOrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Adicionar itens ao checklist",
    description="Adiciona um ou mais itens ao checklist da OS.",
)
async def add_checklist_items(
    service_order_id: int,
    items: list[ChecklistItemCreate],
    _: CurrentUser,
    repo: Repository,
) -> ServiceOrderResponse:
    row = await repo.add_checklist(
        service_order_id, [item.model_dump() for item in items]
    )
    if row is None:
        raise _not_found("Ordem de serviço não encontrada.")
    return ServiceOrderResponse.model_validate(row)


@router.patch(
    "/{service_order_id}/checklist/{item_id}",
    response_model=ChecklistItemResponse,
    summary="Atualizar item do checklist",
    description="Atualiza o item e registra ou remove seu timestamp de conclusão.",
)
async def update_checklist_item(
    service_order_id: int,
    item_id: int,
    payload: ChecklistItemUpdate,
    _: CurrentUser,
    repo: Repository,
) -> ChecklistItemResponse:
    row = await repo.update_checklist(
        service_order_id, item_id, payload.model_dump(exclude_unset=True)
    )
    if row is None:
        raise _not_found("Item de checklist não encontrado.")
    item = next((entry for entry in row["checklist_items"] if entry["id"] == item_id), None)
    if item is None:
        raise _not_found("Item de checklist não encontrado.")
    return ChecklistItemResponse.model_validate(item)


@router.delete(
    "/{service_order_id}/checklist/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover item do checklist",
    description="Remove um item do checklist da OS.",
)
async def delete_checklist_item(
    service_order_id: int, item_id: int, _: CurrentUser, repo: Repository
) -> None:
    if not await repo.delete_checklist(service_order_id, item_id):
        raise _not_found("Item de checklist não encontrado.")


def _not_found(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def _raise_database_error(error: Exception) -> None:
    if getattr(error, "sqlstate", None) == "23503":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cliente, técnico ou referência informada não existe.",
        ) from error
    if getattr(error, "sqlstate", None) == "23505":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma ordem de serviço com os dados informados.",
        ) from error
    raise error
