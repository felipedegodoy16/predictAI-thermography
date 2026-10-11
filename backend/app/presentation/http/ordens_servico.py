from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.domain.entity.ordem_servico import StatusOrdemServico
from app.infrastructure.persistence.postgres_ordem_servico_repository import (
    PostgresOrdemServicoRepository,
)
from app.presentation.http.dependencies import (
    AuthenticatedUser,
    get_current_user,
    get_ordem_servico_repository,
)
from app.presentation.schemas.ordens_servico import (
    ChecklistItemCreate,
    ChecklistItemResponse,
    ChecklistItemUpdate,
    KanbanBoardResponse,
    OrdemServicoCreate,
    OrdemServicoResponse,
    OrdemServicoStatusUpdate,
    OrdemServicoUpdate,
)

router = APIRouter()
CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
Repository = Annotated[
    PostgresOrdemServicoRepository, Depends(get_ordem_servico_repository)
]


@router.post(
    "/",
    response_model=OrdemServicoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar ordem de serviço",
    description="Cria uma OS e, opcionalmente, seus itens iniciais de checklist.",
)
async def criar_ordem_servico(
    payload: OrdemServicoCreate, _: CurrentUser, repo: Repository
) -> OrdemServicoResponse:
    try:
        return OrdemServicoResponse.model_validate(
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
async def obter_kanban(_: CurrentUser, repo: Repository) -> KanbanBoardResponse:
    board = await repo.kanban()
    return KanbanBoardResponse(
        colunas={key: [OrdemServicoResponse.model_validate(item) for item in items]
                 for key, items in board.items()}
    )


@router.get(
    "/",
    response_model=list[OrdemServicoResponse],
    summary="Listar ordens de serviço",
    description="Lista OSs com filtros e paginação.",
)
async def listar_ordens_servico(
    _: CurrentUser,
    repo: Repository,
    status_os: Annotated[StatusOrdemServico | None, Query(alias="status")] = None,
    tecnico_id: UUID | None = None,
    prioridade: str | None = Query(default=None, pattern=r"^(BAIXA|MEDIA|ALTA|CRITICA)$"),
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[OrdemServicoResponse]:
    rows = await repo.list(
        status=status_os, tecnico_id=tecnico_id, prioridade=prioridade,
        skip=skip, limit=limit,
    )
    return [OrdemServicoResponse.model_validate(row) for row in rows]


@router.get(
    "/{os_id}",
    response_model=OrdemServicoResponse,
    summary="Obter ordem de serviço",
    description="Retorna os dados completos da OS e seu checklist ordenado.",
)
async def obter_ordem_servico(
    os_id: int, _: CurrentUser, repo: Repository
) -> OrdemServicoResponse:
    row = await repo.get(os_id)
    if row is None:
        raise _not_found("Ordem de serviço não encontrada.")
    return OrdemServicoResponse.model_validate(row)


@router.patch(
    "/{os_id}/status",
    response_model=OrdemServicoResponse,
    summary="Mover ordem no Kanban",
    description="Atualiza o status e valida os itens obrigatórios antes da conclusão.",
)
async def atualizar_status(
    os_id: int,
    payload: OrdemServicoStatusUpdate,
    _: CurrentUser,
    repo: Repository,
) -> OrdemServicoResponse:
    try:
        row = await repo.update_status(os_id, payload.status, payload.justificativa)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    if row is None:
        raise _not_found("Ordem de serviço não encontrada.")
    return OrdemServicoResponse.model_validate(row)


@router.put(
    "/{os_id}",
    response_model=OrdemServicoResponse,
    summary="Atualizar ordem de serviço",
    description="Atualiza os dados gerais de uma OS.",
)
async def atualizar_ordem_servico(
    os_id: int,
    payload: OrdemServicoUpdate,
    _: CurrentUser,
    repo: Repository,
) -> OrdemServicoResponse:
    try:
        row = await repo.update(os_id, payload.model_dump(exclude_unset=True))
    except Exception as error:
        _raise_database_error(error)
    if row is None:
        raise _not_found("Ordem de serviço não encontrada.")
    return OrdemServicoResponse.model_validate(row)


@router.post(
    "/{os_id}/checklist",
    response_model=OrdemServicoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Adicionar itens ao checklist",
    description="Adiciona um ou mais itens ao checklist da OS.",
)
async def adicionar_checklist(
    os_id: int,
    itens: list[ChecklistItemCreate],
    _: CurrentUser,
    repo: Repository,
) -> OrdemServicoResponse:
    row = await repo.add_checklist(
        os_id, [item.model_dump() for item in itens]
    )
    if row is None:
        raise _not_found("Ordem de serviço não encontrada.")
    return OrdemServicoResponse.model_validate(row)


@router.patch(
    "/{os_id}/checklist/{item_id}",
    response_model=ChecklistItemResponse,
    summary="Atualizar item do checklist",
    description="Atualiza o item e registra ou remove seu timestamp de conclusão.",
)
async def atualizar_item_checklist(
    os_id: int,
    item_id: int,
    payload: ChecklistItemUpdate,
    _: CurrentUser,
    repo: Repository,
) -> ChecklistItemResponse:
    row = await repo.update_checklist(
        os_id, item_id, payload.model_dump(exclude_unset=True)
    )
    if row is None:
        raise _not_found("Item de checklist não encontrado.")
    item = next((entry for entry in row["checklist_itens"] if entry["id"] == item_id), None)
    if item is None:
        raise _not_found("Item de checklist não encontrado.")
    return ChecklistItemResponse.model_validate(item)


@router.delete(
    "/{os_id}/checklist/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover item do checklist",
    description="Remove um item do checklist da OS.",
)
async def remover_item_checklist(
    os_id: int, item_id: int, _: CurrentUser, repo: Repository
) -> None:
    if not await repo.delete_checklist(os_id, item_id):
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
