import asyncio
from pathlib import Path
from typing import Annotated
from uuid import uuid4

import asyncpg
import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import ValidationError

from app.domain.entity.equipment import EquipmentType
from app.infrastructure.ai.groq_equipment_advisor import (
    ManualTextUnavailableError,
    get_equipment_advice,
)
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
from app.presentation.schemas.equipment_advice import (
    EquipmentAdviceRequest,
    EquipmentAdviceResponse,
)
from app.core.config import settings

router = APIRouter()
MANUALS_DIR = Path(__file__).resolve().parents[3] / "manual"
MAX_MANUAL_SIZE = 25 * 1024 * 1024
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
    payload: Annotated[str, Form(...)],
    _: CurrentUser,
    repository: Repository,
    manual: Annotated[UploadFile | None, File()] = None,
) -> EquipmentResponse:
    try:
        equipment_payload = EquipmentCreate.model_validate_json(payload)
    except ValidationError as error:
        raise HTTPException(status_code=422, detail=error.errors(include_context=False)) from error

    stored_path: Path | None = None
    if manual is not None:
        original_name = Path(manual.filename or "manual.pdf").name
        if Path(original_name).suffix.lower() != ".pdf" or manual.content_type not in {
            "application/pdf", "application/octet-stream"
        }:
            raise HTTPException(status_code=415, detail="Envie o manual em formato PDF.")
        content = await manual.read(MAX_MANUAL_SIZE + 1)
        if len(content) > MAX_MANUAL_SIZE:
            raise HTTPException(status_code=413, detail="O manual deve ter no máximo 25 MB.")
        if not content.startswith(b"%PDF-"):
            raise HTTPException(status_code=415, detail="O arquivo enviado não é um PDF válido.")
        stored_name = f"manual_equipamento_{uuid4().hex}.pdf"
        stored_path = MANUALS_DIR / stored_name
        await asyncio.to_thread(MANUALS_DIR.mkdir, parents=True, exist_ok=True)
        await asyncio.to_thread(stored_path.write_bytes, content)

    try:
        created = await repository.create(
            {
                **equipment_payload.model_dump(by_alias=False),
                "manual_file_name": stored_path.name if stored_path else None,
            }
        )
    except asyncpg.UniqueViolationError:
        if stored_path:
            stored_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um equipamento com este código patrimonial.",
        ) from None
    except Exception:
        if stored_path:
            stored_path.unlink(missing_ok=True)
        raise
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


@router.get("/{equipment_id}/manual", summary="Baixar manual do equipamento")
async def download_equipment_manual(
    equipment_id: int, _: CurrentUser, repository: Repository
) -> FileResponse:
    equipment = await repository.get(equipment_id)
    filename = equipment.get("manual_file_name") if equipment else None
    path = MANUALS_DIR / filename if filename and Path(filename).name == filename else None
    if not path or not path.is_file():
        raise HTTPException(status_code=404, detail="Manual não encontrado.")
    return FileResponse(path, media_type="application/pdf", filename=equipment["manual_file_name"])


@router.post(
    "/{equipment_id}/orientacao",
    response_model=EquipmentAdviceResponse,
    summary="Consultar IA sobre um problema no equipamento",
)
async def advise_equipment_problem(
    equipment_id: int,
    payload: EquipmentAdviceRequest,
    _: CurrentUser,
    repository: Repository,
) -> EquipmentAdviceResponse:
    api_key = settings.groq_api_key.get_secret_value()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="A integração com a Groq ainda não está configurada no backend.",
        )

    equipment = await repository.get(equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado.")
    filename = equipment.get("manual_file_name")
    manual_path = MANUALS_DIR / filename if filename and Path(filename).name == filename else None
    if not manual_path or not manual_path.is_file():
        raise HTTPException(status_code=422, detail="Este equipamento ainda não tem manual PDF cadastrado.")

    try:
        equipment_description = ", ".join(
            part
            for part in [
                equipment["name"],
                equipment.get("manufacturer"),
                equipment.get("model"),
                equipment.get("serial_number"),
            ]
            if part
        )
        advice = await get_equipment_advice(
            api_key=api_key,
            model=settings.groq_model,
            manual_path=manual_path,
            equipment_description=equipment_description,
            problem=payload.problem,
        )
        return EquipmentAdviceResponse.model_validate(advice)
    except ManualTextUnavailableError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except ValidationError as error:
        raise HTTPException(
            status_code=502,
            detail="A Groq retornou dados de OS fora do formato esperado. Tente novamente.",
        ) from error
    except (httpx.HTTPError, ValueError, KeyError, TypeError) as error:
        raise HTTPException(
            status_code=502,
            detail="Não foi possível obter a orientação da Groq. Tente novamente.",
        ) from error
