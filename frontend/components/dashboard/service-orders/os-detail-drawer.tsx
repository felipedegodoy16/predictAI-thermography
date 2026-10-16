"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CalendarClock, Check, Clock3, FileText, UserRound, X } from "lucide-react";
import type { ChecklistItem, ServiceOrder } from "@/lib/api";
import { updateChecklistItem } from "@/lib/api";
import { formatDate, isLate, priorityDetails, shortId } from "./constants";

export function OSDetailDrawer({
  order,
  onClose,
  onItemUpdated,
}: {
  order: ServiceOrder;
  onClose: () => void;
  onItemUpdated: (item: ChecklistItem) => void;
}) {
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const priority = priorityDetails(order.priority);

  useEffect(() => {
    setNotes(Object.fromEntries(order.checklistItems.map((item) => [item.id, item.technicianNote ?? ""])));
  }, [order]);

  async function saveItem(item: ChecklistItem, changes: { completed?: boolean; technicianNote?: string }) {
    setSaving(item.id);
    try {
      const updated = await updateChecklistItem(order.id, item.id, changes);
      onItemUpdated(updated);
      if (changes.technicianNote !== undefined) toast.success("Observação técnica salva.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o checklist.");
    } finally {
      setSaving(null);
    }
  }

  const late = isLate(order.dueAt, order.status);
  const completedCount = order.checklistItems.filter((item) => item.completed).length;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-[2px]"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <aside role="dialog" aria-modal="true" aria-labelledby="os-detail-title" className="absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-7">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-slate-500">{order.code}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${priority.className}`}>{priority.label}</span>
            </div>
            <h2 id="os-detail-title" className="mt-2 max-w-[410px] text-lg font-semibold leading-6 text-slate-900">{order.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar detalhes" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="size-5" /></button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <section>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Descrição do serviço</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{order.description}</p>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <InfoCard icon={UserRound} label="Cliente" value={shortId(order.clientId)} detail={order.clientId} />
            <InfoCard icon={UserRound} label="Técnico responsável" value={shortId(order.technicianId)} detail={order.technicianId ?? "Sem técnico atribuído"} />
            <InfoCard icon={CalendarClock} label="Previsão" value={formatDate(order.dueAt, true)} detail={late ? "Prazo ultrapassado" : "Data de conclusão prevista"} danger={late} />
            <InfoCard icon={Clock3} label="Criada em" value={formatDate(order.createdAt, true)} detail="Registro de abertura" />
          </section>

          {late ? (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-800">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              Esta ordem ultrapassou a data prevista de conclusão.
            </div>
          ) : null}

          <section>
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Checklist operacional</p>
                <h3 className="mt-1 text-sm font-semibold text-slate-800">Etapas de execução</h3>
              </div>
              <span className="text-xs font-medium text-slate-500">{completedCount} de {order.checklistItems.length} concluídas</span>
            </div>
            {order.checklistItems.length ? (
              <div className="mt-3 space-y-3">
                {order.checklistItems.map((item, index) => (
                  <article key={item.id} className="rounded-xl border border-slate-200 p-3.5">
                    <div className="flex items-start gap-3">
                      <label className="mt-0.5 flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          disabled={saving === item.id}
                          onChange={(event) => saveItem(item, { completed: event.target.checked })}
                          aria-label={`Marcar etapa ${index + 1} como ${item.completed ? "pendente" : "concluída"}`}
                          className="size-4 rounded accent-brand-primary disabled:opacity-50"
                        />
                      </label>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={`text-sm font-medium ${item.completed ? "text-slate-500 line-through" : "text-slate-800"}`}>{item.description}</p>
                          {item.required ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-semibold text-rose-700">Obrigatória</span> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-medium text-slate-500">Opcional</span>}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
                          {item.completed ? <><Check className="size-3 text-emerald-600" /> Concluída em {formatDate(item.completedAt, true)}</> : "Pendente"}
                          {saving === item.id ? <span className="ml-1 size-3 animate-spin rounded-full border border-slate-300 border-t-brand-primary" /> : null}
                        </div>
                        <label htmlFor={`checklist-note-${item.id}`} className="mt-3 block text-[10px] font-semibold text-slate-500">Observação técnica</label>
                        <textarea
                          id={`checklist-note-${item.id}`}
                          rows={2}
                          value={notes[item.id] ?? ""}
                          onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                          onBlur={() => {
                            const nextNote = notes[item.id] ?? "";
                            if (nextNote !== (item.technicianNote ?? "")) saveItem(item, { technicianNote: nextNote });
                          }}
                          placeholder="Registre uma observação desta etapa…"
                          className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10"
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-slate-300 px-4 py-7 text-center">
                <FileText className="mx-auto size-5 text-slate-400" />
                <p className="mt-2 text-xs font-medium text-slate-600">Esta ordem não possui etapas cadastradas.</p>
              </div>
            )}
          </section>

          <section className="border-t border-slate-100 pt-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Registro da ordem</p>
            <div className="mt-3 flex gap-3">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-brand-primary"><Clock3 className="size-3.5" /></span>
              <div>
                <p className="text-xs font-medium text-slate-700">Ordem criada em {formatDate(order.createdAt, true)}</p>
                <p className="mt-1 text-[11px] text-slate-500">Status atual: {order.status.replaceAll("_", " ").toLowerCase()}</p>
              </div>
            </div>
            {order.statusNote ? <p className="ml-10 mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{order.statusNote}</p> : null}
          </section>
        </div>
      </aside>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  detail,
  danger = false,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  detail: string | null;
  danger?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3.5">
      <div className={`flex items-center gap-1.5 text-[10px] font-medium ${danger ? "text-rose-700" : "text-slate-500"}`}><Icon className="size-3.5" />{label}</div>
      <p className={`mt-2 truncate text-xs font-semibold ${danger ? "text-rose-700" : "text-slate-800"}`} title={detail ?? undefined}>{value}</p>
      <p className="mt-1 truncate font-mono text-[9px] text-slate-400" title={detail ?? undefined}>{detail}</p>
    </div>
  );
}
