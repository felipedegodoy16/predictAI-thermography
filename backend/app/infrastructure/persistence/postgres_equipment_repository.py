import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

import asyncpg


class PostgresEquipmentRepository:
    def __init__(self, pool: asyncpg.Pool, *, account_id: UUID | None = None) -> None:
        self._pool = pool
        self._account_id = account_id

    async def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        async with self._pool.acquire() as connection, connection.transaction():
            equipment_id = await connection.fetchval(
                "SELECT nextval(pg_get_serial_sequence('equipment', 'id'))"
            )
            code = f"EQ-{datetime.now(timezone.utc).year}-{equipment_id:06d}"
            row = await connection.fetchrow(
                """INSERT INTO equipment
                   (id, code, name, equipment_type, manufacturer,
                    yellow_limit_c, red_limit_c, capture_interval_seconds, model,
                    serial_number, asset_tag, location, criticality,
                    installation_date, notes, specifications, manual_file_name, account_id)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                           $13, $14, $15, $16::jsonb, $17, $18)
                   RETURNING *""",
                equipment_id,
                code,
                payload["name"],
                payload["equipment_type"].value,
                payload.get("manufacturer"),
                payload["yellow_limit_c"],
                payload["red_limit_c"],
                payload["capture_interval_seconds"],
                payload.get("model"),
                payload.get("serial_number"),
                payload.get("asset_tag"),
                payload.get("location"),
                payload["criticality"],
                payload.get("installation_date"),
                payload.get("notes"),
                json.dumps({}),
                payload.get("manual_file_name"),
                self._account_id,
            )
            return self._to_dict(row)

    async def get(self, equipment_id: int) -> dict[str, Any] | None:
        row = await self._pool.fetchrow(
            "SELECT * FROM equipment WHERE id = $1 AND ($2::UUID IS NULL OR account_id = $2)", equipment_id, self._account_id
        )
        return self._to_dict(row) if row else None

    async def update(self, equipment_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
        row = await self._pool.fetchrow(
            """UPDATE equipment
               SET name = $2,
                   equipment_type = $3,
                   manufacturer = $4,
                   yellow_limit_c = $5,
                   red_limit_c = $6,
                   capture_interval_seconds = $7,
                   model = $8,
                   serial_number = $9,
                   asset_tag = $10,
                   location = $11,
                   criticality = $12,
                   installation_date = $13,
                   notes = $14
               WHERE id = $1 AND ($15::UUID IS NULL OR account_id = $15)
               RETURNING *""",
            equipment_id,
            payload["name"],
            payload["equipment_type"].value,
            payload["manufacturer"],
            payload["yellow_limit_c"],
            payload["red_limit_c"],
            payload["capture_interval_seconds"],
            payload.get("model"),
            payload.get("serial_number"),
            payload.get("asset_tag"),
            payload.get("location"),
            payload["criticality"],
            payload.get("installation_date"),
            payload.get("notes"),
            self._account_id,
        )
        return self._to_dict(row) if row else None

    async def list(
        self, *, limit: int, offset: int, equipment_type: str | None = None
    ) -> list[dict[str, Any]]:
        rows = await self._pool.fetch(
            """SELECT * FROM equipment
               WHERE ($1::UUID IS NULL OR account_id = $1)
                 AND ($2::TEXT IS NULL OR equipment_type = $2)
               ORDER BY created_at DESC, id DESC
               LIMIT $3 OFFSET $4""",
            self._account_id,
            equipment_type,
            limit,
            offset,
        )
        return [self._to_dict(row) for row in rows]

    @staticmethod
    def _to_dict(row: asyncpg.Record) -> dict[str, Any]:
        return dict(row)
