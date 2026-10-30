"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Eye, Image, Plus, Search, Wrench } from "lucide-react";
import { toast } from "sonner";
import { EquipmentCreateDrawer } from "@/components/dashboard/equipment/equipment-create-drawer";
import { EquipmentDetailDrawer } from "@/components/dashboard/equipment/equipment-detail-drawer";
import {
  getEquipmentTypes,
  listEquipments,
  type Equipment,
  type EquipmentType,
  type EquipmentTypeOption,
} from "@/lib/api";

const CRITICALITY_LABELS = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  CRITICA: "Crítica",
} as const;

const CRITICALITY_STYLES = {
  BAIXA: "bg-slate-100 text-slate-600",
  MEDIA: "bg-sky-50 text-sky-700",
  ALTA: "bg-amber-50 text-amber-800",
  CRITICA: "bg-rose-50 text-rose-700",
} as const;

export function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [types, setTypes] = useState<EquipmentTypeOption[]>([]);
  const [typeFilter, setTypeFilter] = useState<EquipmentType | "">("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailEquipment, setDetailEquipment] = useState<Equipment | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    Promise.all([
      getEquipmentTypes(),
      listEquipments({ equipmentType: typeFilter || undefined, limit: 100 }),
    ])
      .then(([equipmentTypes, rows]) => {
        if (!active) return;
        setTypes(equipmentTypes);
        setEquipment(rows);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Não foi possível carregar os equipamentos.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey, typeFilter]);

  const filteredEquipment = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    if (!query) return equipment;
    return equipment.filter((item) =>
      `${item.code} ${item.name} ${item.assetTag ?? ""} ${item.manufacturer ?? ""} ${item.model ?? ""} ${item.location ?? ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(query),
    );
  }, [equipment, search]);

  async function handleCreated() {
    setCreateOpen(false);
    setRefreshKey((value) => value + 1);
    toast.success("Equipamento cadastrado.");
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Equipamentos</h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">Fabricante, tipo e limites de temperatura para acompanhamento termográfico.</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          disabled={loading || types.length === 0}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white transition hover:bg-brand-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus aria-hidden="true" className="size-4" /> Cadastrar equipamento
        </button>
      </header>

      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_5px_20px_rgba(15,45,54,0.04)]">
        <div className="flex flex-col gap-2.5 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <p className="text-xs font-medium text-slate-600">
            {loading ? "Carregando equipamentos…" : `${filteredEquipment.length} equipamento${filteredEquipment.length === 1 ? "" : "s"}`}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 sm:w-64">
              <span className="sr-only">Buscar equipamentos</span>
              <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar equipamento…"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10"
              />
            </label>
            <label className="sm:w-52">
              <span className="sr-only">Filtrar por tipo</span>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as EquipmentType | "")}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10"
              >
                <option value="">Todos os tipos</option>
                {types.map((type) => <option key={type.equipmentType} value={type.equipmentType}>{type.label}</option>)}
              </select>
            </label>
          </div>
        </div>

        {loadError ? (
          <div role="alert" className="p-5 text-center">
            <p className="text-sm text-rose-700">{loadError}</p>
            <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="mt-2 min-h-10 rounded-lg px-3 text-sm font-semibold text-brand-primary hover:bg-teal-50">
              Tentar novamente
            </button>
          </div>
        ) : loading ? (
          <div role="status" className="p-8 text-center text-sm text-slate-500">Carregando equipamentos…</div>
        ) : filteredEquipment.length ? (
          <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
            {filteredEquipment.map((item) => (
              <EquipmentCard key={item.id} equipment={item} types={types} onDetails={() => setDetailEquipment(item)} />
            ))}
          </div>
        ) : equipment.length ? (
          <div className="px-4 py-10 text-center">
            <h2 className="text-sm font-semibold text-slate-800">Nenhum equipamento encontrado</h2>
            <p className="mt-1 text-xs text-slate-500">Altere a busca ou o tipo selecionado.</p>
          </div>
        ) : (
          <div className="px-4 py-10 text-center sm:py-14">
            <span className="mx-auto flex size-10 items-center justify-center rounded-xl bg-teal-50 text-brand-primary">
              <Wrench aria-hidden="true" className="size-5" />
            </span>
            <h2 className="mt-3 text-sm font-semibold text-slate-800">Nenhum equipamento cadastrado</h2>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">Cadastre os equipamentos para organizar os ativos que serão acompanhados pelo sistema.</p>
            <button type="button" onClick={() => setCreateOpen(true)} className="mt-4 min-h-10 rounded-lg bg-brand-primary px-4 text-xs font-semibold text-white hover:bg-brand-primary-hover">
              Cadastrar primeiro equipamento
            </button>
          </div>
        )}
      </section>

      {createOpen ? (
        <EquipmentCreateDrawer
          types={types}
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreated}
        />
      ) : null}
      {detailEquipment ? (
        <EquipmentDetailDrawer equipment={detailEquipment} types={types} onClose={() => setDetailEquipment(null)} />
      ) : null}
    </div>
  );
}

function EquipmentCard({ equipment, types, onDetails }: { equipment: Equipment; types: EquipmentTypeOption[]; onDetails: () => void }) {
  const type = types.find((option) => option.equipmentType === equipment.equipmentType);
  return (
    <article className="min-w-0 rounded-xl border border-slate-200 p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-medium text-slate-500">{equipment.code}</p>
          <h2 className="mt-1 truncate text-sm font-semibold text-slate-900" title={equipment.name}>{equipment.name}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{type?.label ?? equipment.equipmentType}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${CRITICALITY_STYLES[equipment.criticality]}`}>
          {CRITICALITY_LABELS[equipment.criticality]}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-100 pt-3 text-[11px]">
        {equipment.yellowLimitC !== null ? <EquipmentFact label="Alerta" value={`${equipment.yellowLimitC.toLocaleString("pt-BR")} °C`} /> : null}
        {equipment.redLimitC !== null ? <EquipmentFact label="OS urgente" value={`${equipment.redLimitC.toLocaleString("pt-BR")} °C`} /> : null}
        {equipment.manualFileName ? <EquipmentFact label="Manual" value={equipment.manualFileName} /> : null}
        {equipment.assetTag ? <EquipmentFact label="Patrimônio" value={equipment.assetTag} /> : null}
        {equipment.location ? <EquipmentFact label="Local" value={equipment.location} /> : null}
        {equipment.manufacturer || equipment.model ? <EquipmentFact label="Fabricante / modelo" value={[equipment.manufacturer, equipment.model].filter(Boolean).join(" · ")} /> : null}
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={`/equipamentos/${equipment.id}/imagens`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-brand-primary px-3 text-xs font-semibold text-white hover:bg-brand-primary-hover">
          <Image aria-hidden="true" className="size-3.5" /> Imagens termográficas
        </Link>
        <button type="button" onClick={onDetails} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:border-brand-primary/30 hover:bg-teal-50 hover:text-brand-primary">
          <Eye aria-hidden="true" className="size-3.5" /> Ver detalhes
        </button>
      </div>
    </article>
  );
}

function EquipmentFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] text-slate-400">{label}</dt>
      <dd className="truncate font-medium text-slate-700" title={value}>{value}</dd>
    </div>
  );
}
