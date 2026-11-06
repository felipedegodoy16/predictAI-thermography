import json
from typing import Any
from uuid import UUID

import asyncpg


class PostgresThermographicImageRepository:
    def __init__(self, pool: asyncpg.Pool, *, account_id: UUID | None = None) -> None:
        self._pool = pool
        self._account_id = account_id

    async def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        row = await self._pool.fetchrow(
            """INSERT INTO thermographic_images
               (equipment_id, original_file_name, temperature_matrix_file_name,
                visible_image_file_name, thermal_image_file_name,
                thermal_overlay_file_name, metadata_file_name, analysis_metadata, account_id)
               SELECT $1, $2, $3, $4, $5, $6, $7, $8::jsonb, equipment.account_id
               FROM equipment WHERE equipment.id = $1 AND ($9::UUID IS NULL OR equipment.account_id = $9)
               RETURNING *""",
            payload["equipment_id"],
            payload["original_file_name"],
            payload["temperature_matrix_file_name"],
            payload["visible_image_file_name"],
            payload["thermal_image_file_name"],
            payload["thermal_overlay_file_name"],
            payload["metadata_file_name"],
            json.dumps(payload["analysis_metadata"], ensure_ascii=False, allow_nan=False),
            self._account_id,
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
            WHERE images.id = $1 AND ($2::UUID IS NULL OR images.account_id = $2)""",
            image_id,
            self._account_id,
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
               WHERE id = $1 AND ($4::UUID IS NULL OR account_id = $4)""",
            image_id,
            file_name,
            json.dumps(metadata, ensure_ascii=False, allow_nan=False),
            self._account_id,
        )

    async def list(
        self,
        *,
        equipment_id: int | None = None,
        limit: int | None = None,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        rows = await self._pool.fetch(
            """SELECT images.*, equipment.name AS equipment_name
               FROM thermographic_images AS images
               JOIN equipment ON equipment.id = images.equipment_id
               WHERE ($1::UUID IS NULL OR images.account_id = $1)
                 AND ($2::BIGINT IS NULL OR images.equipment_id = $2)
               ORDER BY images.created_at DESC, images.id DESC
               LIMIT $3 OFFSET $4""",
            self._account_id,
            equipment_id,
            limit,
            offset,
        )
        return [self._to_dict(row) for row in rows]

    @staticmethod
    def _to_dict(row: asyncpg.Record) -> dict[str, Any]:
        result = dict(row)
        metadata = result["analysis_metadata"]
        if isinstance(metadata, str):
            result["analysis_metadata"] = json.loads(metadata)
        return result
