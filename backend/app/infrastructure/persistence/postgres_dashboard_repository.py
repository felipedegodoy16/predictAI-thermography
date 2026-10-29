import asyncpg

from app.domain.entity.service_order import ServiceOrderPriority, ServiceOrderStatus


class PostgresDashboardRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def summary(self) -> dict[str, object]:
        totals = await self._pool.fetchrow(
            """SELECT
                   COUNT(*) FILTER (
                       WHERE status NOT IN ('CONCLUIDO', 'CANCELADO')
                   ) AS open_orders,
                   COUNT(*) FILTER (WHERE status = 'CONCLUIDO') AS completed_orders,
                   COUNT(*) FILTER (WHERE status = 'CANCELADO') AS cancelled_orders,
                   COUNT(*) FILTER (
                       WHERE due_at < NOW()
                         AND status NOT IN ('CONCLUIDO', 'CANCELADO')
                   ) AS overdue_orders
               FROM service_orders"""
        )
        status_rows = await self._pool.fetch(
            "SELECT status, COUNT(*) AS count FROM service_orders GROUP BY status"
        )
        priority_rows = await self._pool.fetch(
            """SELECT priority, COUNT(*) AS count FROM service_orders
               WHERE status NOT IN ('CONCLUIDO', 'CANCELADO')
               GROUP BY priority"""
        )
        month_rows = await self._pool.fetch(
            """WITH months AS (
                   SELECT generate_series(
                       date_trunc('month', NOW()) - INTERVAL '5 months',
                       date_trunc('month', NOW()),
                       INTERVAL '1 month'
                   ) AS month
               )
               SELECT to_char(months.month, 'YYYY-MM') AS month,
                      (SELECT COUNT(*) FROM service_orders
                       WHERE created_at >= months.month
                         AND created_at < months.month + INTERVAL '1 month') AS opened,
                      (SELECT COUNT(*) FROM service_orders
                       WHERE completed_at >= months.month
                         AND completed_at < months.month + INTERVAL '1 month') AS completed
               FROM months ORDER BY months.month"""
        )

        by_status = {status: 0 for status in ServiceOrderStatus}
        for row in status_rows:
            by_status[ServiceOrderStatus(row["status"])] = row["count"]

        by_priority = {priority: 0 for priority in ServiceOrderPriority}
        for row in priority_rows:
            by_priority[ServiceOrderPriority(row["priority"])] = row["count"]

        completed = totals["completed_orders"]
        cancelled = totals["cancelled_orders"]
        return {
            "open_orders": totals["open_orders"],
            "closed_orders": completed + cancelled,
            "completed_orders": completed,
            "cancelled_orders": cancelled,
            "overdue_orders": totals["overdue_orders"],
            "by_status": by_status,
            "by_priority": by_priority,
            "monthly_activity": [dict(row) for row in month_rows],
        }
