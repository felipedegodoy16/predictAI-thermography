import asyncio
import json
import logging
from pathlib import Path
from typing import Annotated, Literal
from uuid import uuid4

import asyncpg
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse

from app.core.config import BACKEND_DIR, settings
from app.infrastructure.persistence.postgres_equipment_repository import PostgresEquipmentRepository
from app.infrastructure.email.thermal_alarm import send_thermal_alarm_email
from app.infrastructure.persistence.postgres_thermographic_image_repository import (
    PostgresThermographicImageRepository,
)
from app.infrastructure.thermography.termography_analysis import (
    InvalidThermographyFile,
    Is2ThermographyProcessor,
    create_thermal_overlay_from_files,
    measure_temperature_region,
)
from app.presentation.http.dependencies import (
    AuthenticatedUser,
    get_current_user,
    get_equipment_repository,
    get_thermographic_image_repository,
    get_user_repository,
)
from app.domain.repositories.user_repository import IUserRepository
from app.presentation.schemas.thermographic_images import ThermographicImageResponse
from app.presentation.schemas.thermographic_measurements import (
    ThermographicRegionMeasurementRequest,
    ThermographicRegionMeasurementResponse,
)

router = APIRouter()
logger = logging.getLogger(__name__)
IMAGES_DIR = BACKEND_DIR / "images"
PROCESSED_DIR = BACKEND_DIR / "thermography"
MAX_IS2_SIZE = 50 * 1024 * 1024
CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
Repository = Annotated[
    PostgresThermographicImageRepository,
    Depends(get_thermographic_image_repository),
]
EquipmentRepository = Annotated[
    PostgresEquipmentRepository,
    Depends(get_equipment_repository),
]
UserRepository = Annotated[IUserRepository, Depends(get_user_repository)]


@router.post(
    "",
    response_model=ThermographicImageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Enviar e processar imagem termográfica IS2",
)
async def upload_thermographic_image(
    _: CurrentUser,
    repository: Repository,
    equipment_repository: EquipmentRepository,
    user_repository: UserRepository,
    equipment_id: Annotated[int, Form(alias="equipamento_id", gt=0)],
    file: Annotated[UploadFile, File(alias="arquivo")],
) -> ThermographicImageResponse:
    if settings.app_env.casefold() not in {"development", "test", "testing"}:
        logger.warning(
            "thermography.upload.rejected reason=manual_upload_disabled app_env=%s equipment_id=%s",
            settings.app_env,
            equipment_id,
        )
        raise HTTPException(
            status_code=403,
            detail="O envio manual de imagens está disponível somente nos ambientes de teste.",
        )
    if Path(file.filename or "").suffix.lower() != ".is2":
        raise HTTPException(status_code=415, detail="Envie um arquivo de termografia com extensão .is2.")
    content = await file.read(MAX_IS2_SIZE + 1)
    if not content:
        raise HTTPException(status_code=422, detail="O arquivo enviado está vazio.")
    if len(content) > MAX_IS2_SIZE:
        raise HTTPException(status_code=413, detail="O arquivo IS2 deve ter no máximo 50 MB.")

    equipment = await equipment_repository.get(equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado.")
    if equipment.get("yellow_limit_c") is None or equipment.get("red_limit_c") is None:
        raise HTTPException(
            status_code=422,
            detail="Cadastre os limites de temperatura do equipamento antes de enviar imagens.",
        )

    logger.info(
        "thermography.upload.started equipment_id=%s file_size_bytes=%s",
        equipment_id,
        len(content),
    )
    image_id = uuid4().hex
    original_name = f"imagem_termografica_{image_id}.is2"
    original_path = IMAGES_DIR / original_name
    generated_names = [
        f"temperature_matrix_{image_id}.csv",
        f"visible_{image_id}.jpg",
        f"thermal_{image_id}.png",
        f"thermal_overlay_{image_id}.png",
        f"metadata_{image_id}.json",
    ]
    try:
        processed = await asyncio.to_thread(
            Is2ThermographyProcessor().process,
            content,
            PROCESSED_DIR,
            image_id,
        )
        maximum = processed.metadata["statistics"]["max"]
        yellow_limit = float(equipment["yellow_limit_c"])
        red_limit = float(equipment["red_limit_c"])
        thermal_status = "URGENTE" if maximum >= red_limit else "ALERTA" if maximum >= yellow_limit else "NORMAL"
        processed.metadata["thermal_status"] = thermal_status
        processed.metadata["limits_c"] = {
            "yellow": yellow_limit,
            "red": red_limit,
        }
        await asyncio.to_thread(
            (PROCESSED_DIR / processed.metadata_file_name).write_text,
            json.dumps(processed.metadata, ensure_ascii=False, allow_nan=False),
            encoding="utf-8",
        )
        await asyncio.to_thread(IMAGES_DIR.mkdir, parents=True, exist_ok=True)
        await asyncio.to_thread(original_path.write_bytes, content)
        created = await repository.create(
            {
                "equipment_id": equipment_id,
                "original_file_name": original_name,
                "temperature_matrix_file_name": processed.matrix_file_name,
                "visible_image_file_name": processed.visible_image_file_name,
                "thermal_image_file_name": processed.thermal_image_file_name,
                "thermal_overlay_file_name": processed.thermal_overlay_file_name,
                "metadata_file_name": processed.metadata_file_name,
                "analysis_metadata": processed.metadata,
            }
        )
    except InvalidThermographyFile as error:
        logger.warning(
            "thermography.upload.rejected reason=invalid_is2 equipment_id=%s error=%s",
            equipment_id,
            error,
        )
        _cleanup_upload(original_path, generated_names)
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception:
        logger.exception(
            "thermography.upload.failed stage=process_or_persist equipment_id=%s image_id=%s",
            equipment_id,
            image_id,
        )
        _cleanup_upload(original_path, generated_names)
        raise
    logger.info(
        "thermography.analysis.completed equipment_id=%s image_id=%s status=%s max_c=%.2f yellow_limit_c=%.2f red_limit_c=%.2f",
        equipment_id,
        created["id"],
        thermal_status,
        float(maximum),
        yellow_limit,
        red_limit,
    )
    response_data = dict(created)
    if maximum >= red_limit:
        try:
            admin_emails = await user_repository.list_admin_emails()
            if admin_emails:
                response_data["alarm_email_sent"] = await asyncio.to_thread(
                    send_thermal_alarm_email,
                    recipients=admin_emails,
                    equipment_code=str(equipment.get("code", equipment_id)),
                    equipment_name=str(equipment.get("name", "Equipamento")),
                    maximum_temperature=float(maximum),
                    alarm_limit=red_limit,
                    normal_image_path=PROCESSED_DIR / processed.visible_image_file_name,
                    thermal_image_path=PROCESSED_DIR / processed.thermal_image_file_name,
                    settings=settings,
                )
            else:
                response_data["alarm_email_sent"] = False
                logger.warning(
                    "thermography.alarm_email.skipped reason=no_admin_recipients equipment_id=%s image_id=%s",
                    equipment_id,
                    created["id"],
                )
        except Exception:
            response_data["alarm_email_sent"] = False
            logger.exception(
                "thermography.alarm_email.failed equipment_id=%s image_id=%s",
                equipment_id,
                created["id"],
            )
    return ThermographicImageResponse.model_validate(response_data)


@router.get("", response_model=list[ThermographicImageResponse], summary="Listar imagens termográficas")
async def list_thermographic_images(
    _: CurrentUser,
    repository: Repository,
    equipment_id: Annotated[int | None, Query(alias="equipamento_id", gt=0)] = None,
    limit: Annotated[int | None, Query(ge=1, le=10000)] = None,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[ThermographicImageResponse]:
    rows = await repository.list(equipment_id=equipment_id, limit=limit, offset=offset)
    return [ThermographicImageResponse.model_validate(row) for row in rows]


@router.post(
    "/{image_id}/medir-regiao",
    response_model=ThermographicRegionMeasurementResponse,
    summary="Medir temperaturas em uma região da imagem térmica",
)
async def measure_thermographic_region(
    image_id: int,
    payload: ThermographicRegionMeasurementRequest,
    _: CurrentUser,
    repository: Repository,
) -> ThermographicRegionMeasurementResponse:
    record = await repository.get(image_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Imagem termográfica não encontrada.")
    metadata = record.get("analysis_metadata") or {}
    registration = metadata.get("overlay_registration")
    matrix_name = record.get("temperature_matrix_file_name")
    matrix_path = PROCESSED_DIR / matrix_name if matrix_name and Path(matrix_name).name == matrix_name else None
    if not matrix_path or not matrix_path.is_file():
        raise HTTPException(status_code=404, detail="Matriz radiométrica não encontrada.")
    if metadata.get("overlay_alignment_version") != 2 or not _registration_is_current(registration):
        registration = await _rebuild_overlay_registration(record, image_id, repository, metadata, matrix_path)
    try:
        result = await asyncio.to_thread(
            measure_temperature_region,
            matrix_path,
            registration,
            payload.x,
            payload.y,
            payload.width,
            payload.height,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return ThermographicRegionMeasurementResponse.model_validate(result)


@router.get(
    "/{image_id}/{asset}",
    summary="Baixar arquivo ou resultado termográfico",
)
async def download_thermographic_asset(
    image_id: int,
    asset: Literal["original", "normal", "termica", "sobreposicao", "matriz"],
    _: CurrentUser,
    repository: Repository,
) -> FileResponse:
    record = await repository.get(image_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Imagem termográfica não encontrada.")
    if asset == "sobreposicao":
        matrix_name = record.get("temperature_matrix_file_name")
        matrix_path = PROCESSED_DIR / matrix_name if matrix_name and Path(matrix_name).name == matrix_name else None
        if not matrix_path or not matrix_path.is_file():
            raise HTTPException(status_code=404, detail="Matriz radiométrica não encontrada para gerar a sobreposição.")
        image_token = Path(record["thermal_image_file_name"]).stem.removeprefix("thermal_")
        overlay_name = record.get("thermal_overlay_file_name") or f"thermal_overlay_{image_token}.png"
        overlay_path = PROCESSED_DIR / overlay_name
        metadata = dict(record["analysis_metadata"])
        if metadata.get("overlay_alignment_version") != 2 or not _registration_is_current(metadata.get("overlay_registration")) or not overlay_path.is_file():
            await _rebuild_overlay_registration(record, image_id, repository, metadata, matrix_path, overlay_name)
            metadata = dict(record["analysis_metadata"])
        record["thermal_overlay_file_name"] = overlay_name
        record["analysis_metadata"] = metadata
    file_config = {
        "original": (IMAGES_DIR, "original_file_name", "application/octet-stream"),
        "normal": (PROCESSED_DIR, "visible_image_file_name", "image/jpeg"),
        "termica": (PROCESSED_DIR, "thermal_image_file_name", "image/png"),
        "sobreposicao": (PROCESSED_DIR, "thermal_overlay_file_name", "image/png"),
        "matriz": (PROCESSED_DIR, "temperature_matrix_file_name", "text/csv; charset=utf-8"),
    }
    directory, key, media_type = file_config[asset]
    filename = record[key]
    path = directory / filename if filename and Path(filename).name == filename else None
    if not path or not path.is_file():
        raise HTTPException(status_code=404, detail="Arquivo termográfico não encontrado.")
    return FileResponse(path, media_type=media_type, filename=filename)


def _cleanup_upload(original_path: Path, generated_names: list[str]) -> None:
    original_path.unlink(missing_ok=True)
    for filename in generated_names:
        (PROCESSED_DIR / filename).unlink(missing_ok=True)


def _registration_is_current(registration: object) -> bool:
    if not isinstance(registration, dict):
        return False
    required = ("x", "y", "width", "height", "visible_width", "visible_height")
    try:
        x, y, width, height, visible_width, visible_height = (float(registration[key]) for key in required)
        values = (x, y, width, height, visible_width, visible_height)
        return (
            all(value >= 0 and value < float("inf") for value in values)
            and width > 0 and height > 0 and visible_width > 0 and visible_height > 0
            and x + width <= visible_width and y + height <= visible_height
        )
    except (KeyError, TypeError, ValueError):
        return False


async def _rebuild_overlay_registration(
    record: dict,
    image_id: int,
    repository: PostgresThermographicImageRepository,
    metadata: dict,
    matrix_path: Path,
    overlay_name: str | None = None,
) -> dict:
    visible_name = record.get("visible_image_file_name")
    original_name = record.get("original_file_name")
    visible_path = PROCESSED_DIR / visible_name if visible_name and Path(visible_name).name == visible_name else None
    original_path = IMAGES_DIR / original_name if original_name and Path(original_name).name == original_name else None
    if not visible_path or not visible_path.is_file() or not original_path or not original_path.is_file():
        raise HTTPException(status_code=404, detail="Arquivos originais não encontrados para alinhar a sobreposição.")

    if overlay_name is None:
        thermal_name = record.get("thermal_image_file_name") or ""
        image_token = Path(thermal_name).stem.removeprefix("thermal_") or str(image_id)
        overlay_name = record.get("thermal_overlay_file_name") or f"thermal_overlay_{image_token}.png"
    if Path(overlay_name).name != overlay_name:
        raise HTTPException(status_code=404, detail="Arquivo de sobreposição inválido.")
    overlay_path = PROCESSED_DIR / overlay_name
    try:
        registration = await asyncio.to_thread(
            create_thermal_overlay_from_files,
            matrix_path,
            visible_path,
            original_path,
            overlay_path,
        )
    except InvalidThermographyFile as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    metadata["overlay_alignment_version"] = 2
    metadata["overlay_registration"] = registration
    await repository.update_thermal_overlay(image_id, overlay_name, metadata)
    metadata_name = record.get("metadata_file_name")
    if metadata_name and Path(metadata_name).name == metadata_name:
        await asyncio.to_thread(
            (PROCESSED_DIR / metadata_name).write_text,
            json.dumps(metadata, ensure_ascii=False, allow_nan=False),
            encoding="utf-8",
        )
    record["thermal_overlay_file_name"] = overlay_name
    record["analysis_metadata"] = metadata
    return registration
