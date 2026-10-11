from datetime import datetime, timezone
from typing import Any
from uuid import UUID

import asyncpg

from app.domain.entity.ordem_servico import StatusOrdemServico


class PostgresOrdemServicoRepository:
    """Persistência assíncrona de ordens de serviço e seus checklists."""

    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        async with self._pool.acquire() as conn, conn.transaction():
            os_id = await conn.fetchval(
                "SELECT nextval(pg_get_serial_sequence('ordens_servico', 'id'))"
            )
            now = datetime.now(timezone.utc)
            codigo = f"OS-{now.year}-{os_id:04d}"
            row = await conn.fetchrow(
                """INSERT INTO ordens_servico
                   (id, codigo_os, titulo, descricao, prioridade, cliente_id,
                    tecnico_id, data_previsao)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                   RETURNING *""",
                os_id, codigo, payload["titulo"], payload["descricao"],
                payload["prioridade"], payload["cliente_id"], payload.get("tecnico_id"),
                payload.get("data_previsao"),
            )
            await self._insert_items(conn, os_id, payload.get("checklist_itens", []))
            return await self._get_with_connection(conn, row)

    async def get(self, os_id: int) -> dict[str, Any] | None:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM ordens_servico WHERE id = $1", os_id
            )
            return await self._get_with_connection(conn, row) if row else None

    async def list(
        self, *, status: StatusOrdemServico | None, tecnico_id: UUID | None,
        prioridade: str | None, skip: int, limit: int,
    ) -> list[dict[str, Any]]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """SELECT * FROM ordens_servico
                   WHERE ($1::TEXT IS NULL OR status = $1)
                     AND ($2::UUID IS NULL OR tecnico_id = $2)
                     AND ($3::TEXT IS NULL OR prioridade = $3)
                   ORDER BY data_criacao DESC, id DESC OFFSET $4 LIMIT $5""",
                status.value if status else None, tecnico_id, prioridade, skip, limit,
            )
            return [await self._get_with_connection(conn, row) for row in rows]

    async def kanban(self) -> dict[StatusOrdemServico, list[dict[str, Any]]]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM ordens_servico ORDER BY data_criacao DESC, id DESC"
            )
            board = {value: [] for value in StatusOrdemServico}
            for row in rows:
                board[StatusOrdemServico(row["status"])].append(
                    await self._get_with_connection(conn, row)
                )
            return board

    async def update(self, os_id: int, changes: dict[str, Any]) -> dict[str, Any] | None:
        if not changes:
            return await self.get(os_id)
        allowed = {"titulo", "descricao", "prioridade", "cliente_id", "tecnico_id", "data_previsao"}
        assignments = []
        values: list[Any] = [os_id]
        for field, value in changes.items():
            if field in allowed:
                values.append(value)
                assignments.append(f"{field} = ${len(values)}")
        async with self._pool.acquire() as conn, conn.transaction():
            row = await conn.fetchrow(
                f"UPDATE ordens_servico SET {', '.join(assignments)} WHERE id = $1 RETURNING *",
                *values,
            )
            return await self._get_with_connection(conn, row) if row else None

    async def update_status(
        self, os_id: int, new_status: StatusOrdemServico, justificativa: str | None
    ) -> dict[str, Any] | None:
        async with self._pool.acquire() as conn, conn.transaction():
            row = await conn.fetchrow(
                "SELECT * FROM ordens_servico WHERE id = $1 FOR UPDATE", os_id
            )
            if row is None:
                return None
            if new_status == StatusOrdemServico.CONCLUIDO:
                pending = await conn.fetchval(
                    """SELECT EXISTS(SELECT 1 FROM checklist_itens_os
                       WHERE ordem_servico_id = $1 AND obrigatorio AND NOT concluido)""",
                    os_id,
                )
                if pending:
                    raise ValueError("Existem itens obrigatórios pendentes no checklist")
            closed_at = datetime.now(timezone.utc) if new_status == StatusOrdemServico.CONCLUIDO else None
            updated = await conn.fetchrow(
                """UPDATE ordens_servico SET status = $2,
                   data_conclusao = CASE WHEN $2 = 'CONCLUIDO' THEN $3 ELSE NULL END,
                   observacao_status = $4
                   WHERE id = $1 RETURNING *""",
                os_id, new_status.value, closed_at, justificativa,
            )
            return await self._get_with_connection(conn, updated)

    async def add_checklist(
        self, os_id: int, items: list[dict[str, Any]]
    ) -> dict[str, Any] | None:
        async with self._pool.acquire() as conn, conn.transaction():
            exists = await conn.fetchval("SELECT EXISTS(SELECT 1 FROM ordens_servico WHERE id=$1)", os_id)
            if not exists:
                return None
            await self._insert_items(conn, os_id, items)
            return await self._get_with_connection(conn, await conn.fetchrow(
                "SELECT * FROM ordens_servico WHERE id=$1", os_id
            ))

    async def update_checklist(
        self, os_id: int, item_id: int, changes: dict[str, Any]
    ) -> dict[str, Any] | None:
        if "concluido" in changes:
            changes["data_conclusao_item"] = datetime.now(timezone.utc) if changes["concluido"] else None
        allowed = {"concluido", "observacao_tecnico", "descricao", "obrigatorio", "ordem", "data_conclusao_item"}
        sets, values = [], [os_id, item_id]
        for field, value in changes.items():
            if field in allowed:
                values.append(value)
                sets.append(f"{field} = ${len(values)}")
        async with self._pool.acquire() as conn, conn.transaction():
            if sets:
                row = await conn.fetchrow(
                    f"UPDATE checklist_itens_os SET {', '.join(sets)} WHERE ordem_servico_id=$1 AND id=$2 RETURNING id",
                    *values,
                )
                if row is None:
                    return None
            elif not await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM checklist_itens_os WHERE ordem_servico_id=$1 AND id=$2)",
                os_id, item_id,
            ):
                return None
            os_row = await conn.fetchrow("SELECT * FROM ordens_servico WHERE id=$1", os_id)
            return await self._get_with_connection(conn, os_row) if os_row else None

    async def delete_checklist(self, os_id: int, item_id: int) -> bool:
        result = await self._pool.execute(
            "DELETE FROM checklist_itens_os WHERE ordem_servico_id=$1 AND id=$2",
            os_id, item_id,
        )
        return result.endswith("1")

    @staticmethod
    async def _insert_items(
        conn: asyncpg.Connection, os_id: int, items: list[dict[str, Any]]
    ) -> None:
        for item in items:
            await conn.execute(
                """INSERT INTO checklist_itens_os
                   (ordem_servico_id, descricao, obrigatorio, ordem)
                   VALUES ($1, $2, $3, $4)""",
                os_id, item["descricao"], item.get("obrigatorio", True), item.get("ordem", 0),
            )

    @staticmethod
    async def _get_with_connection(
        conn: asyncpg.Connection, row: asyncpg.Record
    ) -> dict[str, Any]:
        result = dict(row)
        items = await conn.fetch(
            """SELECT * FROM checklist_itens_os WHERE ordem_servico_id=$1
               ORDER BY ordem, id""",
            result["id"],
        )
        result["checklist_itens"] = [dict(item) for item in items]
        return result
