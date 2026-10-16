"use client";

import { useDroppable } from "@dnd-kit/core";
import { ClipboardX, Plus } from "lucide-react";
import type { ServiceOrder, ServiceOrderStatus } from "@/lib/api";
import type { SERVICE_ORDER_COLUMNS } from "./constants";
import { ServiceOrderCard } from "./service-order-card";

type Column = (typeof SERVICE_ORDER_COLUMNS)[number];

export function KanbanColumn({
  column,
  orders,
  onOpen,
  onCreate,
}: {
  column: Column;
  orders: ServiceOrder[];
  onOpen: (order: ServiceOrder) => void;
  onCreate: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { status: column.id satisfies ServiceOrderStatus } });

  return (
    <section
      ref={setNodeRef}
      aria-label={`${column.label}, ${orders.length} ordens`}
      className={
        "flex min-h-[420px] max-h-[calc(100vh-285px)] min-w-[264px] flex-col rounded-xl border p-3 transition-colors sm:min-w-[288px] " +
        (isOver ? "border-brand-primary/40 bg-teal-50/75" : "border-slate-200/80 bg-[#edf5f7]")
      }
    >
      <header className="mb-3 flex items-center justify-between px-1">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`size-2 rounded-full ${column.tone}`} />
          <div className="min-w-0">
            <h2 className="truncate text-xs font-semibold text-slate-800">{column.label}</h2>
            <p className="text-[9px] text-slate-500">{column.description}</p>
          </div>
        </div>
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-slate-600 shadow-sm">{orders.length}</span>
      </header>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-0.5">
        {orders.length ? orders.map((order) => (
          <ServiceOrderCard key={order.id} order={order} onOpen={onOpen} />
        )) : (
          <div className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300/90 px-4 text-center">
            <ClipboardX className="size-5 text-slate-400" />
            <p className="mt-2 text-[11px] font-medium text-slate-500">Nenhuma ordem nesta etapa</p>
            <p className="mt-1 text-[10px] text-slate-400">Arraste uma ordem para cá</p>
          </div>
        )}
      </div>
      {column.id === "BACKLOG" ? (
        <button type="button" onClick={onCreate} className="mt-3 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 text-[11px] font-semibold text-slate-500 transition hover:border-brand-primary/40 hover:bg-white hover:text-brand-primary">
          <Plus className="size-3.5" /> Nova ordem
        </button>
      ) : null}
    </section>
  );
}
