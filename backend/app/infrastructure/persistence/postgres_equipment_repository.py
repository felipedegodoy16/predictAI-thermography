import json
from datetime import datetime, timezone
from typing import Any

import asyncpg


class PostgresEquipmentRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        async with self._pool.acquire() as connection, connection.transaction():
            equipment_id = await connection.fetchval(
                "SELECT nextval(pg_get_serial_sequence('equipment', 'id'))"
            )
            code = f"EQ-{datetime.now(timezone.utc).year}-{equipment_id:06d}"
            row = await connection.fetchrow(
                """INSERT INTO equipment
                   (id, code, name, equipment_type, manufacturer, model,
                    serial_number, asset_tag, location, criticality,
                    installation_date, notes, specifications, manual_file_name)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                           $13::jsonb, $14)
                   RETURNING *""",
                equipment_id,
                code,
                payload["name"],
                payload["equipment_type"].value,
                payload.get("manufacturer"),
                payload.get("model"),
                payload.get("serial_number"),
                payload.get("asset_tag"),
                payload.get("location"),
                payload["criticality"],
                payload.get("installation_date"),
                payload.get("notes"),
                json.dumps(payload.get("specifications", {})),
                payload.get("manual_file_name"),
            )
            return self._to_dict(row)

    async def get(self, equipment_id: int) -> dict[str, Any] | None:
        row = await self._pool.fetchrow(
            "SELECT * FROM equipment WHERE id = $1", equipment_id
        )
        return self._to_dict(row) if row else None

    async def list(
        self, *, limit: int, offset: int, equipment_type: str | None = None
    ) -> list[dict[str, Any]]:
        rows = await self._pool.fetch(
            """SELECT * FROM equipment
               WHERE ($1::TEXT IS NULL OR equipment_type = $1)
               ORDER BY created_at DESC, id DESC
               LIMIT $2 OFFSET $3""",
            equipment_type,
            limit,
            offset,
        )
        return [self._to_dict(row) for row in rows]

    @staticmethod
    def _to_dict(row: asyncpg.Record) -> dict[str, Any]:
        result = dict(row)
        specifications = result["specifications"]
        if isinstance(specifications, str):
            result["specifications"] = json.loads(specifications)
        return result
