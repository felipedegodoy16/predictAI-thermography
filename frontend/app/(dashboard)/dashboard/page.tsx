"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, ClipboardCheck, ClipboardList, Flame, RefreshCw, Timer } from "lucide-react";
import { getDashboardSummary, getDashboardThermalAlerts, type DashboardSummary, type DashboardThermalAlertEquipment, type ServiceOrderPriority, type ServiceOrderStatus } from "@/lib/api";

const STATUS_LABELS: Record<ServiceOrderStatus, string> = {
  BACKLOG: "A iniciar",
  EM_ANDAMENTO: "Em andamento",
  AGUARDANDO_PECA: "Aguardando peça",
  EM_REVISAO: "Em revisão",
  CONCLUIDO: "Concluídas",
  CANCELADO: "Canceladas",
};
const STATUS_COLORS: Record<ServiceOrderStatus, string> = {
  BACKLOG: "bg-slate-400",
  EM_ANDAMENTO: "bg-sky-500",
  AGUARDANDO_PECA: "bg-amber-500",
  EM_REVISAO: "bg-violet-500",
  CONCLUIDO: "bg-emerald-500",
  CANCELADO: "bg-slate-300",
};
const PRIORITY_LABELS: Record<ServiceOrderPriority, string> = {
  CRITICA: "Crítica",
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
};
const PRIORITY_COLORS: Record<ServiceOrderPriority, string> = {
  CRITICA: "bg-rose-600",
  ALTA: "bg-orange-500",
  MEDIA: "bg-sky-500",
  BAIXA: "bg-slate-400",
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [thermalAlerts, setThermalAlerts] = useState<DashboardThermalAlertEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    setError("");
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const [dashboardSummary, alertingEquipment] = await Promise.all([
        getDashboardSummary(),
        getDashboardThermalAlerts(),
      ]);
      setSummary(dashboardSummary);
      setThermalAlerts(alertingEquipment);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar o dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Dashboard</h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">Volume de ordens, prazos e andamento da manutenção.</p>
        </div>
        <button type="button" onClick={() => void load(true)} disabled={refreshing || loading} aria-label="Atualizar dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
          <RefreshCw aria-hidden="true" className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} /> <span className="hidden sm:inline">Atualizar</span>
        </button>
      </header>

      {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-white p-5 text-center"><AlertTriangle className="mx-auto size-5 text-rose-600" /><p className="mt-2 text-sm text-rose-800">{error}</p><button type="button" onClick={() => void load()} className="mt-3 min-h-10 rounded-lg px-3 text-xs font-semibold text-brand-primary hover:bg-teal-50">Tentar novamente</button></div> : null}

      {!error ? <>
        <section aria-labelledby="thermal-alerts-title" className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_5px_20px_rgba(15,45,54,0.04)]">
          <header className="flex flex-col gap-1 border-b border-slate-100 px-4 py-3.5 sm:flex-row sm:items-end sm:justify-between sm:px-5">
            <div>
              <h2 id="thermal-alerts-title" className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Flame aria-hidden="true" className="size-4 text-rose-600" /> Equipamentos em alerta</h2>
            </div>
            {!loading && thermalAlerts.length ? <span className="text-[10px] font-medium text-slate-500">{thermalAlerts.length} equipamento{thermalAlerts.length === 1 ? "" : "s"}</span> : null}
          </header>
          {loading ? (
            <div role="status" className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3 xl:grid-cols-4"><span className="sr-only">Carregando alertas térmicos</span>{[0, 1, 2, 3].map((item) => <div key={item} className="h-[76px] animate-pulse rounded-xl bg-slate-50" />)}</div>
          ) : thermalAlerts.length ? (
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3 xl:grid-cols-4">
              {thermalAlerts.map((item) => (
                <Link key={item.equipmentId} href={`/equipamentos/${item.equipmentId}/imagens`} aria-label={`${item.equipmentName}, ${item.equipmentCode}: ${item.redAlertImages} imagens vermelhas e ${item.yellowAlertImages} imagens amarelas`} className="flex min-h-[76px] min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 px-3.5 py-3 transition hover:border-brand-primary/40 hover:bg-teal-50/40">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800">{item.equipmentName}</span>
                    <span className="mt-1 block font-mono text-[10px] text-slate-500">{item.equipmentCode}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2.5">
                    {item.redAlertImages > 0 ? <span title={`${item.redAlertImages} imagens no limite vermelho`} className="flex size-9 items-center justify-center rounded-full bg-rose-600 text-xs font-bold tabular-nums text-white">{item.redAlertImages}</span> : null}
                    {item.yellowAlertImages > 0 ? <span title={`${item.yellowAlertImages} imagens no limite amarelo`} className="flex size-9 items-center justify-center rounded-full bg-amber-400 text-xs font-bold tabular-nums text-amber-950">{item.yellowAlertImages}</span> : null}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="px-4 py-6 text-center text-xs text-slate-500 sm:px-5">Nenhum equipamento possui imagens acima dos limites de temperatura.</p>
          )}
        </section>

        <section aria-label="Indicadores de ordens de serviço" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          <MetricCard label="OS abertas" value={summary?.openOrders} icon={<ClipboardList className="size-4" />} tone="teal" loading={loading} href="/kanban" />
          <MetricCard label="OS fechadas" value={summary?.closedOrders} icon={<ClipboardCheck className="size-4" />} tone="green" loading={loading} href="/kanban" />
          <MetricCard label="Concluídas" value={summary?.completedOrders} icon={<ClipboardCheck className="size-4" />} tone="blue" loading={loading} href="/kanban" />
          <MetricCard label="Atrasadas" value={summary?.overdueOrders} icon={<Timer className="size-4" />} tone="rose" loading={loading} href="/kanban" />
        </section>

        <section className="grid gap-3 lg:grid-cols-5">
          <article className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_5px_20px_rgba(15,45,54,0.04)] sm:p-5 lg:col-span-3">
            <h2 className="text-sm font-semibold text-slate-800">Fluxo de ordens</h2>
            <p className="mt-0.5 text-xs text-slate-500">Abertas e concluídas por mês · últimos 6 meses</p>
            <div className="mt-5 grid grid-cols-6 gap-2 sm:gap-4" aria-label="Gráfico de ordens abertas e concluídas">
              {(summary?.monthlyActivity ?? []).map((month) => {
                const peak = Math.max(1, ...((summary?.monthlyActivity ?? []).flatMap((entry) => [entry.opened, entry.completed])));
                return <div key={month.month} className="flex min-w-0 flex-col items-center">
                  <div className="flex h-32 w-full items-end justify-center gap-1 border-b border-slate-100 px-0.5 sm:gap-1.5">
                    <Bar value={month.opened} peak={peak} color="bg-teal-600" label={`Abertas: ${month.opened}`} />
                    <Bar value={month.completed} peak={peak} color="bg-emerald-400" label={`Concluídas: ${month.completed}`} />
                  </div>
                  <span className="mt-2 truncate text-[10px] text-slate-500">{formatMonth(month.month)}</span>
                </div>;
              })}
              {!loading && summary?.monthlyActivity.length === 0 ? <p className="col-span-6 py-10 text-center text-xs text-slate-500">Sem dados no período.</p> : null}
              {loading ? <div className="col-span-6 h-32 animate-pulse rounded-lg bg-slate-50" /> : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-slate-500"><Legend color="bg-teal-600" label="Abertas" /><Legend color="bg-emerald-400" label="Concluídas" /></div>
          </article>

          <article className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_5px_20px_rgba(15,45,54,0.04)] sm:p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold text-slate-800">Ordens por etapa</h2>
            <p className="mt-0.5 text-xs text-slate-500">Volume atual em cada etapa do fluxo</p>
            <div className="mt-5 space-y-3">
              {(Object.keys(STATUS_LABELS) as ServiceOrderStatus[]).map((status) => <DistributionRow key={status} label={STATUS_LABELS[status]} value={summary?.byStatus[status] ?? 0} total={summary ? Object.values(summary.byStatus).reduce((sum, count) => sum + count, 0) : 0} color={STATUS_COLORS[status]} loading={loading} />)}
            </div>
          </article>
        </section>

        <section className="grid gap-3 lg:grid-cols-5">
          <article className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_5px_20px_rgba(15,45,54,0.04)] sm:p-5 lg:col-span-3">
            <h2 className="text-sm font-semibold text-slate-800">Prioridade das OS abertas</h2>
            <p className="mt-0.5 text-xs text-slate-500">Ajuda a identificar concentrações de risco operacional</p>
            <div className="mt-5 space-y-3">
              {(Object.keys(PRIORITY_LABELS) as ServiceOrderPriority[]).map((priority) => <DistributionRow key={priority} label={PRIORITY_LABELS[priority]} value={summary?.byPriority[priority] ?? 0} total={summary?.openOrders ?? 0} color={PRIORITY_COLORS[priority]} loading={loading} />)}
            </div>
          </article>
          <article className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_5px_20px_rgba(15,45,54,0.04)] sm:p-5 lg:col-span-2">
            <div><h2 className="text-sm font-semibold text-slate-800">Acompanhe a operação</h2><p className="mt-1 text-xs leading-5 text-slate-500">Consulte as ordens e a distribuição por etapa e prioridade para orientar as próximas ações da equipe.</p></div>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
              <Link href="/kanban" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-primary px-3 text-xs font-semibold text-white hover:bg-brand-primary-hover"><ClipboardList className="size-3.5" /> Abrir quadro de OS</Link>
              <Link href="/equipamentos" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">Ver equipamentos</Link>
            </div>
          </article>
        </section>
      </> : null}
    </div>
  );
}

function MetricCard({ label, value, icon, tone, loading, href }: { label: string; value?: number; icon: ReactNode; tone: "teal" | "green" | "blue" | "rose"; loading: boolean; href: string }) {
  const tones = { teal: "bg-teal-50 text-teal-700", green: "bg-emerald-50 text-emerald-700", blue: "bg-sky-50 text-sky-700", rose: "bg-rose-50 text-rose-700" };
  return <Link href={href} className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-3 shadow-[0_5px_20px_rgba(15,45,54,0.04)] transition hover:border-teal-200 sm:p-4">
    <span className={`flex size-8 items-center justify-center rounded-lg ${tones[tone]}`}>{icon}</span>
    <span className="mt-3 block text-[11px] text-slate-500 sm:text-xs">{label}</span>
    <span className="mt-0.5 block text-2xl font-semibold tabular-nums text-slate-900 sm:text-[28px]">{loading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-slate-100" /> : value ?? 0}</span>
  </Link>;
}

function Bar({ value, peak, color, label }: { value: number; peak: number; color: string; label: string }) {
  return <span role="img" aria-label={label} title={`${label}`} className={`w-3 rounded-t-sm sm:w-5 ${color}`} style={{ height: `${Math.max(value === 0 ? 0 : 8, (value / peak) * 100)}%` }} />;
}

function DistributionRow({ label, value, total, color, loading }: { label: string; value: number; total: number; color: string; loading: boolean }) {
  const percentage = total ? Math.min(100, (value / total) * 100) : 0;
  return <div>
    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="truncate text-slate-600">{label}</span><span className="shrink-0 font-semibold tabular-nums text-slate-800">{loading ? "—" : value}</span></div>
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color} transition-[width] duration-300`} style={{ width: loading ? "0%" : `${percentage}%` }} /></div>
  </div>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className={`size-2 rounded-sm ${color}`} />{label}</span>;
}

function formatMonth(value: string): string {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(year, month - 1, 1)).replace(".", "");
}
