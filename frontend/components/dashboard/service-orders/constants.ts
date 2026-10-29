import type { ServiceOrderPriority, ServiceOrderStatus } from "@/lib/api";

export const SERVICE_ORDER_COLUMNS: {
  id: ServiceOrderStatus;
  label: string;
  tone: string;
}[] = [
  { id: "BACKLOG", label: "Pendente", tone: "bg-slate-400" },
  { id: "EM_ANDAMENTO", label: "Em andamento", tone: "bg-sky-500" },
  { id: "AGUARDANDO_PECA", label: "Aguardando peças", tone: "bg-amber-500" },
  { id: "EM_REVISAO", label: "Em revisão", tone: "bg-violet-500" },
  { id: "CONCLUIDO", label: "Concluídas", tone: "bg-emerald-500" },
  { id: "CANCELADO", label: "Canceladas", tone: "bg-rose-400" },
];

export const PRIORITIES: {
  id: ServiceOrderPriority;
  label: string;
  className: string;
}[] = [
  { id: "CRITICA", label: "Crítica", className: "border-rose-200 bg-rose-50 text-rose-700" },
  { id: "ALTA", label: "Alta", className: "border-amber-200 bg-amber-50 text-amber-700" },
  { id: "MEDIA", label: "Média", className: "border-sky-200 bg-sky-50 text-sky-700" },
  { id: "BAIXA", label: "Baixa", className: "border-slate-200 bg-slate-100 text-slate-600" },
];

export function priorityDetails(priority: ServiceOrderPriority) {
  return PRIORITIES.find((item) => item.id === priority) ?? PRIORITIES[2];
}

export function formatDate(value: string | null, includeTime = false) {
  if (!value) return "Sem previsão";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

export function isLate(value: string | null, status: ServiceOrderStatus) {
  return Boolean(
    value &&
      status !== "CONCLUIDO" &&
      status !== "CANCELADO" &&
      new Date(value).getTime() < Date.now(),
  );
}

export function shortId(value: string | null) {
  return value ? `${value.slice(0, 8)}…` : "Não atribuído";
}
