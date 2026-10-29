"use client";

import { useDraggable } from "@dnd-kit/core";
import { AlertTriangle, CalendarClock, GripVertical, UserRound } from "lucide-react";
import type { ServiceOrder } from "@/lib/api";
import { formatDate, isLate, priorityDetails } from "./constants";

export function ServiceOrderCard({
  order,
  onOpen,
}: {
  order: ServiceOrder;
  onOpen: (order: ServiceOrder) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
    data: { status: order.status },
  });
  const priority = priorityDetails(order.priority);
  const completed = order.checklistItems.filter((item) => item.completed).length;
  const total = order.checklistItems.length;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const late = isLate(order.dueAt, order.status);

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`
          : undefined,
        zIndex: isDragging ? 30 : undefined,
      }}
      className={
        "group rounded-xl border border-slate-200 bg-white p-3 shadow-[0_2px_8px_rgba(15,45,54,0.035)] transition-shadow hover:border-brand-primary/25 hover:shadow-md sm:p-3.5 " +
        (isDragging ? "opacity-45" : "")
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold tracking-tight text-slate-500">{order.code}</span>
        <div className="flex items-center gap-1.5">
          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${priority.className}`}>{priority.label}</span>
          <button
            type="button"
            aria-label={`Arrastar ordem ${order.code}`}
            title="Arraste para mover de etapa"
            {...attributes}
            {...listeners}
            className="-mr-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 touch-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary sm:size-8"
          >
            <GripVertical className="size-4" />
          </button>
        </div>
      </div>
      <button type="button" onClick={() => onOpen(order)} className="mt-1.5 block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary">
        <h3 className="line-clamp-2 text-[13px] font-semibold leading-5 text-slate-800 group-hover:text-brand-primary">{order.title}</h3>
        <p className="mt-1 truncate text-[10px] text-slate-500" title={order.description}>{order.description}</p>
      </button>

      {total > 0 ? (
        <div className="mt-2.5">
          <div className="mb-1.5 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Checklist <span className="font-medium text-slate-700">{completed}/{total}</span></span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
        <span className={`inline-flex min-w-0 items-center gap-1.5 text-[10px] font-medium ${late ? "text-rose-700" : "text-slate-500"}`}>
          {late ? <AlertTriangle className="size-3.5" /> : <CalendarClock className="size-3.5" />}
          <span className="truncate">{late ? `Atrasada · ${formatDate(order.dueAt)}` : order.dueAt ? formatDate(order.dueAt) : "Sem prazo"}</span>
        </span>
        {!order.technicianId ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-amber-700" title="Nenhum técnico atribuído">
            <UserRound aria-hidden="true" className="size-3.5" /> Sem técnico
          </span>
        ) : null}
      </div>
    </article>
  );
}
