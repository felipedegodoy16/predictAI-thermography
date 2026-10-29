"use client";

import { useDroppable } from "@dnd-kit/core";
import type { ServiceOrder, ServiceOrderStatus } from "@/lib/api";
import type { SERVICE_ORDER_COLUMNS } from "./constants";
import { ServiceOrderCard } from "./service-order-card";

type Column = (typeof SERVICE_ORDER_COLUMNS)[number];

export function KanbanColumn({
  column,
  orders,
  onOpen,
}: {
  column: Column;
  orders: ServiceOrder[];
  onOpen: (order: ServiceOrder) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { status: column.id satisfies ServiceOrderStatus } });

  return (
    <section
      ref={setNodeRef}
      aria-label={`${column.label}, ${orders.length} ordens`}
      className={
        "flex h-[min(58dvh,560px)] min-h-[240px] min-w-[264px] snap-start flex-col rounded-xl border p-2.5 transition-colors sm:min-w-[288px] sm:p-3 " +
        (isOver ? "border-brand-primary/40 bg-teal-50/75" : "border-slate-200/80 bg-[#edf5f7]")
      }
    >
      <header className="mb-3 flex items-center justify-between px-1">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`size-2 rounded-full ${column.tone}`} />
          <h2 className="truncate text-xs font-semibold text-slate-800">{column.label}</h2>
        </div>
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-slate-600 shadow-sm">{orders.length}</span>
      </header>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-0.5">
        {orders.length ? orders.map((order) => (
          <ServiceOrderCard key={order.id} order={order} onOpen={onOpen} />
        )) : (
          <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-slate-300/90 px-4 text-center">
            <p className="text-[11px] text-slate-500">Nenhuma ordem nesta etapa</p>
          </div>
        )}
      </div>
    </section>
  );
}
