"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  closestCorners,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { CreateOSModal } from "@/components/dashboard/service-orders/create-os-modal";
import { KanbanColumn } from "@/components/dashboard/service-orders/kanban-column";
import { OSDetailDrawer } from "@/components/dashboard/service-orders/os-detail-drawer";
import { SERVICE_ORDER_COLUMNS } from "@/components/dashboard/service-orders/constants";
import {
  createServiceOrder,
  getServiceOrderBoard,
  updateServiceOrderStatus,
  type ChecklistItem,
  type ServiceOrder,
  type ServiceOrderInput,
  type ServiceOrderPriority,
  type ServiceOrderStatus,
} from "@/lib/api";

type Board = Record<ServiceOrderStatus, ServiceOrder[]>;

function emptyBoard(): Board {
  return {
    BACKLOG: [],
    EM_ANDAMENTO: [],
    AGUARDANDO_PECA: [],
    EM_REVISAO: [],
    CONCLUIDO: [],
    CANCELADO: [],
  };
}

function orderIsVisible(order: ServiceOrder, search: string, technician: string, priority: string) {
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const matchesSearch = !normalizedSearch ||
    `${order.code} ${order.title} ${order.description}`.toLocaleLowerCase("pt-BR").includes(normalizedSearch);
  return matchesSearch && (!technician || order.technicianId === technician) && (!priority || order.priority === priority);
}

export default function KanbanPage() {
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [technicianFilter, setTechnicianFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const loadBoard = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      setBoard(await getServiceOrderBoard());
      setLoadError("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível carregar as ordens de serviço.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadBoard(); }, [loadBoard]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const allOrders = useMemo(() => SERVICE_ORDER_COLUMNS.flatMap((column) => board[column.id]), [board]);
  const technicians = useMemo(
    () => [...new Set(allOrders.map((order) => order.technicianId).filter((id): id is string => Boolean(id)))],
    [allOrders],
  );
  const totalOrders = allOrders.length;
  const lateOrders = allOrders.filter((order) =>
    order.dueAt && !["CONCLUIDO", "CANCELADO"].includes(order.status) && new Date(order.dueAt).getTime() < Date.now(),
  ).length;
  const inProgress = board.EM_ANDAMENTO.length + board.AGUARDANDO_PECA.length + board.EM_REVISAO.length;
  const activeFilters = Number(Boolean(technicianFilter)) + Number(Boolean(priorityFilter));
  const noMatches = !loading && totalOrders > 0 && allOrders.every((order) => !orderIsVisible(order, search, technicianFilter, priorityFilter));

  function filteredOrders(status: ServiceOrderStatus) {
    return board[status].filter((order) => orderIsVisible(order, search, technicianFilter, priorityFilter));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const orderId = Number(event.active.id);
    const nextStatus = String(event.over?.id ?? "") as ServiceOrderStatus;
    const validStatus = SERVICE_ORDER_COLUMNS.some((column) => column.id === nextStatus);
    const currentStatus = event.active.data.current?.status as ServiceOrderStatus | undefined;
    if (!event.over || !validStatus || !currentStatus || currentStatus === nextStatus) return;
    const order = board[currentStatus].find((item) => item.id === orderId);
    if (!order) return;

    if (nextStatus === "CONCLUIDO") {
      const pendingRequired = order.checklistItems.filter((item) => item.required && !item.completed);
      if (pendingRequired.length) {
        toast.warning("Checklist obrigatório pendente", {
          description: `Conclua ${pendingRequired.length} ${pendingRequired.length === 1 ? "etapa obrigatória" : "etapas obrigatórias"} antes de finalizar esta ordem.`,
        });
        return;
      }
    }

    const previousBoard = board;
    setBoard((current) => ({
      ...current,
      [currentStatus]: current[currentStatus].filter((item) => item.id !== orderId),
      [nextStatus]: [{ ...order, status: nextStatus }, ...current[nextStatus]],
    }));
    try {
      const saved = await updateServiceOrderStatus(orderId, nextStatus);
      setBoard((current) => ({
        ...current,
        [currentStatus]: current[currentStatus].filter((item) => item.id !== orderId),
        [nextStatus]: current[nextStatus].map((item) => item.id === orderId ? saved : item),
      }));
      setSelectedOrder((current) => current?.id === orderId ? saved : current);
      toast.success(`Ordem movida para ${SERVICE_ORDER_COLUMNS.find((column) => column.id === nextStatus)?.label.toLowerCase()}.`);
    } catch (error) {
      setBoard(previousBoard);
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o status. A ordem voltou à etapa anterior.");
    }
  }

  async function handleCreate(input: ServiceOrderInput) {
    try {
      const order = await createServiceOrder(input);
      setBoard((current) => ({ ...current, BACKLOG: [order, ...current.BACKLOG] }));
      setCreateOpen(false);
      toast.success("Ordem de serviço criada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a ordem de serviço.");
    }
  }

  function updateItemInBoard(item: ChecklistItem) {
    setBoard((current) => {
      const next = { ...current };
      for (const column of SERVICE_ORDER_COLUMNS) {
        next[column.id] = current[column.id].map((order) => order.id === item.serviceOrderId
          ? { ...order, checklistItems: order.checklistItems.map((entry) => entry.id === item.id ? item : entry) }
          : order,
        );
      }
      return next;
    });
    setSelectedOrder((current) => current?.id === item.serviceOrderId
      ? { ...current, checklistItems: current.checklistItems.map((entry) => entry.id === item.id ? item : entry) }
      : current,
    );
  }

  const statCards = [
    { label: "Ordens cadastradas", value: totalOrders, icon: ClipboardList, accent: "bg-teal-50 text-brand-primary" },
    { label: "Em execução", value: inProgress, icon: Activity, accent: "bg-sky-50 text-sky-700" },
    { label: "Com prazo vencido", value: lateOrders, icon: AlertTriangle, accent: lateOrders ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-500" },
  ];

  return (
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-brand-primary-light">
            <Wrench className="size-4" /> Gestão de manutenção
          </div>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Ordens de serviço</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">Acompanhe corretivas, rotinas preventivas e atividades preditivas em cada etapa.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void loadBoard(true)} disabled={refreshing} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} /> Atualizar
          </button>
          <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-primary px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary">
            <Plus className="size-4" /> Nova ordem de serviço
          </button>
        </div>
      </section>

      <section aria-label="Resumo das ordens" className="grid gap-3 sm:grid-cols-3">
        {statCards.map(({ label, value, icon: Icon, accent }) => (
          <article key={label} className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-[0_2px_8px_rgba(15,45,54,0.025)] sm:px-5">
            <div><p className="text-[11px] font-medium text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{loading ? "—" : value}</p></div>
            <span className={`flex size-10 items-center justify-center rounded-xl ${accent}`}><Icon className="size-[18px]" /></span>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_5px_20px_rgba(15,45,54,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Quadro de execução</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">Arraste as ordens para atualizar o andamento.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[210px] flex-1 sm:w-[250px] sm:flex-none">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar código ou atividade…" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none placeholder:text-slate-400 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10" />
            </label>
            <button type="button" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-xs font-semibold ${filtersOpen || activeFilters ? "border-brand-primary/30 bg-teal-50 text-brand-primary" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
              <Filter className="size-3.5" /> Filtros{activeFilters ? <span className="flex size-4 items-center justify-center rounded-full bg-brand-primary text-[9px] text-white">{activeFilters}</span> : null}
            </button>
          </div>
        </div>
        {filtersOpen ? (
          <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 bg-slate-50/75 px-4 py-3 sm:px-5">
            <label className="min-w-48 flex-1 text-[10px] font-semibold text-slate-500 sm:flex-none">
              Técnico responsável
              <select value={technicianFilter} onChange={(event) => setTechnicianFilter(event.target.value)} className="mt-1 block h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-normal text-slate-700 outline-none focus:border-brand-primary">
                <option value="">Todos os técnicos</option>
                {technicians.map((id) => <option key={id} value={id}>{shortTechnician(id)}</option>)}
              </select>
            </label>
            <label className="min-w-40 flex-1 text-[10px] font-semibold text-slate-500 sm:flex-none">
              Prioridade
              <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="mt-1 block h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-normal text-slate-700 outline-none focus:border-brand-primary">
                <option value="">Todas as prioridades</option>
                <option value="CRITICA">Crítica</option><option value="ALTA">Alta</option><option value="MEDIA">Média</option><option value="BAIXA">Baixa</option>
              </select>
            </label>
            {activeFilters ? <button type="button" onClick={() => { setTechnicianFilter(""); setPriorityFilter(""); }} className="inline-flex h-9 items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-primary"><X className="size-3.5" /> Limpar filtros</button> : null}
          </div>
        ) : null}

        {loading ? (
          <div className="flex gap-3 overflow-hidden p-4 sm:p-5" aria-label="Carregando quadro">
            {SERVICE_ORDER_COLUMNS.map((column) => <div key={column.id} className="min-h-[390px] min-w-[264px] flex-1 animate-pulse rounded-xl bg-slate-100 p-4"><div className="h-4 w-28 rounded bg-slate-200" /><div className="mt-5 h-32 rounded-lg bg-white" /><div className="mt-3 h-32 rounded-lg bg-white" /></div>)}
          </div>
        ) : loadError ? (
          <div className="px-5 py-16 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700"><AlertTriangle className="size-6" /></span>
            <h3 className="mt-4 text-sm font-semibold text-slate-800">Não foi possível carregar o quadro</h3>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-slate-500">{loadError}</p>
            <button type="button" onClick={() => void loadBoard()} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="size-3.5" /> Tentar novamente</button>
          </div>
        ) : totalOrders === 0 ? (
          <div className="px-5 py-16 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-teal-50 text-brand-primary"><ClipboardList className="size-6" /></span>
            <h3 className="mt-4 text-sm font-semibold text-slate-800">Seu quadro está pronto para receber ordens</h3>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-slate-500">Cadastre a primeira ordem de serviço para organizar as atividades corretivas, preventivas e preditivas da equipe.</p>
            <button type="button" onClick={() => setCreateOpen(true)} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-primary px-4 text-xs font-semibold text-white hover:bg-brand-primary-hover"><Plus className="size-4" /> Criar primeira ordem</button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={(event) => void handleDragEnd(event)}>
            <div className="grid auto-cols-[minmax(264px,1fr)] grid-flow-col gap-3 overflow-x-auto p-4 sm:auto-cols-[minmax(288px,1fr)] sm:p-5">
              {SERVICE_ORDER_COLUMNS.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  orders={filteredOrders(column.id)}
                  onOpen={setSelectedOrder}
                  onCreate={() => setCreateOpen(true)}
                />
              ))}
            </div>
          </DndContext>
        )}
        {noMatches ? (
          <p className="border-t border-slate-100 px-5 py-3 text-center text-xs text-slate-500">Nenhuma ordem corresponde à busca e aos filtros atuais.</p>
        ) : null}
      </section>

      <p className="flex items-center gap-2 px-1 text-[10px] text-slate-400"><CalendarClock className="size-3.5" /> Os prazos são exibidos conforme o fuso local do navegador.</p>

      {createOpen ? <CreateOSModal onClose={() => setCreateOpen(false)} onCreate={handleCreate} /> : null}
      {selectedOrder ? <OSDetailDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} onItemUpdated={updateItemInBoard} /> : null}
    </div>
  );
}

function shortTechnician(id: string) {
  return `Técnico ${id.slice(0, 8)}…`;
}
