from datetime import datetime, timezone
from typing import Any
from uuid import UUID

import asyncpg

from app.domain.entity.service_order import ServiceOrderStatus


class PostgresServiceOrderRepository:
    """Persist service orders and their checklist items asynchronously."""

    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        async with self._pool.acquire() as conn, conn.transaction():
            service_order_id = await conn.fetchval(
                "SELECT nextval(pg_get_serial_sequence('service_orders', 'id'))"
            )
            now = datetime.now(timezone.utc)
            code = f"OS-{now.year}-{service_order_id:04d}"
            row = await conn.fetchrow(
                """INSERT INTO service_orders
                   (id, code, title, description, priority, client_id,
                    technician_id, due_at, equipment_id)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                   RETURNING *""",
                service_order_id, code, payload["title"], payload["description"],
                payload["priority"], payload["client_id"], payload.get("technician_id"),
                payload.get("due_at"), payload.get("equipment_id"),
            )
            await self._insert_items(conn, service_order_id, payload.get("checklist_items", []))
            return await self._get_with_connection(conn, row)

    async def get(self, service_order_id: int) -> dict[str, Any] | None:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM service_orders WHERE id = $1", service_order_id
            )
            return await self._get_with_connection(conn, row) if row else None

    async def list(
        self, *, status: ServiceOrderStatus | None, technician_id: UUID | None,
        priority: str | None, skip: int, limit: int,
    ) -> list[dict[str, Any]]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """SELECT * FROM service_orders
                   WHERE ($1::TEXT IS NULL OR status = $1)
                     AND ($2::UUID IS NULL OR technician_id = $2)
                     AND ($3::TEXT IS NULL OR priority = $3)
                   ORDER BY created_at DESC, id DESC OFFSET $4 LIMIT $5""",
                status.value if status else None, technician_id, priority, skip, limit,
            )
            return [await self._get_with_connection(conn, row) for row in rows]

    async def kanban(self) -> dict[ServiceOrderStatus, list[dict[str, Any]]]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM service_orders ORDER BY created_at DESC, id DESC"
            )
            board = {value: [] for value in ServiceOrderStatus}
            for row in rows:
                board[ServiceOrderStatus(row["status"])].append(
                    await self._get_with_connection(conn, row)
                )
            return board

    async def update(self, service_order_id: int, changes: dict[str, Any]) -> dict[str, Any] | None:
        if not changes:
            return await self.get(service_order_id)
        allowed = {"title", "description", "priority", "client_id", "technician_id", "due_at"}
        assignments = []
        values: list[Any] = [service_order_id]
        for field, value in changes.items():
            if field in allowed:
                values.append(value)
                assignments.append(f"{field} = ${len(values)}")
        async with self._pool.acquire() as conn, conn.transaction():
            row = await conn.fetchrow(
                f"UPDATE service_orders SET {', '.join(assignments)} WHERE id = $1 RETURNING *",
                *values,
            )
            return await self._get_with_connection(conn, row) if row else None

    async def update_status(
        self, service_order_id: int, new_status: ServiceOrderStatus, reason: str | None
    ) -> dict[str, Any] | None:
        async with self._pool.acquire() as conn, conn.transaction():
            row = await conn.fetchrow(
                "SELECT * FROM service_orders WHERE id = $1 FOR UPDATE", service_order_id
            )
            if row is None:
                return None
            if new_status == ServiceOrderStatus.COMPLETED:
                pending = await conn.fetchval(
                    """SELECT EXISTS(SELECT 1 FROM checklist_items
                       WHERE service_order_id = $1 AND required AND NOT completed)""",
                    service_order_id,
                )
                if pending:
                    raise ValueError("Required checklist items are still pending.")
            closed_at = datetime.now(timezone.utc) if new_status == ServiceOrderStatus.COMPLETED else None
            updated = await conn.fetchrow(
                """UPDATE service_orders SET status = $2::varchar,
                   completed_at = $3::timestamptz,
                   status_note = $4
                   WHERE id = $1 RETURNING *""",
                service_order_id, new_status.value, closed_at, reason,
            )
            return await self._get_with_connection(conn, updated)

    async def add_checklist(
        self, service_order_id: int, items: list[dict[str, Any]]
    ) -> dict[str, Any] | None:
        async with self._pool.acquire() as conn, conn.transaction():
            exists = await conn.fetchval("SELECT EXISTS(SELECT 1 FROM service_orders WHERE id=$1)", service_order_id)
            if not exists:
                return None
            await self._insert_items(conn, service_order_id, items)
            return await self._get_with_connection(conn, await conn.fetchrow(
                "SELECT * FROM service_orders WHERE id=$1", service_order_id
            ))

    async def update_checklist(
        self, service_order_id: int, item_id: int, changes: dict[str, Any]
    ) -> dict[str, Any] | None:
        if "completed" in changes:
            changes["item_completed_at"] = datetime.now(timezone.utc) if changes["completed"] else None
        allowed = {"completed", "technician_note", "description", "required", "sort_order", "item_completed_at"}
        sets, values = [], [service_order_id, item_id]
        for field, value in changes.items():
            if field in allowed:
                values.append(value)
                sets.append(f"{field} = ${len(values)}")
        async with self._pool.acquire() as conn, conn.transaction():
            if sets:
                row = await conn.fetchrow(
                    f"UPDATE checklist_items SET {', '.join(sets)} WHERE service_order_id=$1 AND id=$2 RETURNING id",
                    *values,
                )
                if row is None:
                    return None
            elif not await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM checklist_items WHERE service_order_id=$1 AND id=$2)",
                service_order_id, item_id,
            ):
                return None
            os_row = await conn.fetchrow("SELECT * FROM service_orders WHERE id=$1", service_order_id)
            return await self._get_with_connection(conn, os_row) if os_row else None

    async def delete_checklist(self, service_order_id: int, item_id: int) -> bool:
        result = await self._pool.execute(
            "DELETE FROM checklist_items WHERE service_order_id=$1 AND id=$2",
            service_order_id, item_id,
        )
        return result.endswith("1")

    @staticmethod
    async def _insert_items(
        conn: asyncpg.Connection, service_order_id: int, items: list[dict[str, Any]]
    ) -> None:
        for item in items:
            await conn.execute(
                """INSERT INTO checklist_items
                   (service_order_id, description, required, sort_order)
                   VALUES ($1, $2, $3, $4)""",
                service_order_id, item["description"], item.get("required", True), item.get("sort_order", 0),
            )

    @staticmethod
    async def _get_with_connection(
        conn: asyncpg.Connection, row: asyncpg.Record
    ) -> dict[str, Any]:
        result = dict(row)
        items = await conn.fetch(
            """SELECT * FROM checklist_items WHERE service_order_id=$1
               ORDER BY sort_order, id""",
            result["id"],
        )
        result["checklist_items"] = [dict(item) for item in items]
        return result
