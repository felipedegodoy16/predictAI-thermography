import json
from typing import Any

import asyncpg


class PostgresThermographicImageRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        row = await self._pool.fetchrow(
            """INSERT INTO thermographic_images
               (equipment_id, original_file_name, temperature_matrix_file_name,
                visible_image_file_name, thermal_image_file_name,
                thermal_overlay_file_name, metadata_file_name, analysis_metadata)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
               RETURNING *""",
            payload["equipment_id"],
            payload["original_file_name"],
            payload["temperature_matrix_file_name"],
            payload["visible_image_file_name"],
            payload["thermal_image_file_name"],
            payload["thermal_overlay_file_name"],
            payload["metadata_file_name"],
            json.dumps(payload["analysis_metadata"], ensure_ascii=False, allow_nan=False),
        )
        created = await self.get(row["id"])
        if created is None:
            raise RuntimeError("A imagem termográfica recém-cadastrada não foi encontrada.")
        return created

    async def get(self, image_id: int) -> dict[str, Any] | None:
        row = await self._pool.fetchrow(
            """SELECT images.*, equipment.name AS equipment_name
               FROM thermographic_images AS images
               JOIN equipment ON equipment.id = images.equipment_id
               WHERE images.id = $1""",
            image_id,
        )
        return self._to_dict(row) if row else None

    async def update_thermal_overlay(
        self,
        image_id: int,
        file_name: str,
        metadata: dict[str, Any],
    ) -> None:
        await self._pool.execute(
            """UPDATE thermographic_images
               SET thermal_overlay_file_name = $2,
                   analysis_metadata = $3::jsonb
               WHERE id = $1""",
            image_id,
            file_name,
            json.dumps(metadata, ensure_ascii=False, allow_nan=False),
        )

    async def list(self, *, equipment_id: int | None = None) -> list[dict[str, Any]]:
        rows = await self._pool.fetch(
            """SELECT images.*, equipment.name AS equipment_name
               FROM thermographic_images AS images
               JOIN equipment ON equipment.id = images.equipment_id
               WHERE ($1::BIGINT IS NULL OR images.equipment_id = $1)
               ORDER BY images.created_at DESC, images.id DESC""",
            equipment_id,
        )
        return [self._to_dict(row) for row in rows]

    @staticmethod
    def _to_dict(row: asyncpg.Record) -> dict[str, Any]:
        result = dict(row)
        metadata = result["analysis_metadata"]
        if isinstance(metadata, str):
            result["analysis_metadata"] = json.loads(metadata)
        return result
