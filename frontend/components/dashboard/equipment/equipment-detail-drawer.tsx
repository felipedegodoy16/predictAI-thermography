"use client";

import { useEffect, useState } from "react";
import { Download, FileText, X } from "lucide-react";
import { getEquipmentManual, type Equipment, type EquipmentTypeOption } from "@/lib/api";

const CRITICALITY_LABELS = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  CRITICA: "Crítica",
} as const;

export function EquipmentDetailDrawer({
  equipment,
  types,
  onClose,
}: {
  equipment: Equipment;
  types: EquipmentTypeOption[];
  onClose: () => void;
}) {
  const [manualUrl, setManualUrl] = useState("");
  const [manualLoading, setManualLoading] = useState(Boolean(equipment.manualFileName));
  const [manualError, setManualError] = useState("");
  const type = types.find((item) => item.equipmentType === equipment.equipmentType);

  useEffect(() => {
    if (!equipment.manualFileName) {
      setManualUrl("");
      setManualLoading(false);
      return;
    }
    let active = true;
    let objectUrl = "";
    setManualUrl("");
    setManualLoading(true);
    setManualError("");
    void getEquipmentManual(equipment.id)
      .then((file) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(file);
        setManualUrl(objectUrl);
      })
      .catch((error: unknown) => {
        if (active) setManualError(error instanceof Error ? error.message : "Não foi possível carregar o manual.");
      })
      .finally(() => { if (active) setManualLoading(false); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [equipment.id, equipment.manualFileName]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="equipment-detail-title" className="flex h-[96dvh] max-h-[98dvh] w-full max-w-[min(96vw,100rem)] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <header className="flex items-start justify-between border-b border-slate-100 px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <p className="font-mono text-[11px] text-slate-500">{equipment.code}</p>
            <h2 id="equipment-detail-title" className="mt-0.5 truncate text-lg font-semibold text-slate-900">{equipment.name}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{type?.label ?? equipment.equipmentType}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {manualUrl && equipment.manualFileName ? (
              <a href={manualUrl} download={equipment.manualFileName} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-primary px-3 text-xs font-semibold text-white hover:bg-brand-primary-hover">
                <Download aria-hidden="true" className="size-4" /><span className="hidden sm:inline">Baixar manual</span>
              </a>
            ) : null}
            <button type="button" onClick={onClose} aria-label="Fechar detalhes" className="flex size-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><X aria-hidden="true" className="size-5" /></button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[320px_minmax(0,1fr)] lg:overflow-hidden">
          <aside className="space-y-4 border-b border-slate-100 p-4 sm:p-5 lg:overflow-y-auto lg:border-b-0 lg:border-r">
            <section>
              <h3 className="text-xs font-semibold text-slate-800">Dados do equipamento</h3>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3">
                <DetailFact label="Limite de alerta" value={formatLimit(equipment.yellowLimitC)} />
                <DetailFact label="Limite para OS urgente" value={formatLimit(equipment.redLimitC)} />
                <DetailFact label="Criticidade" value={CRITICALITY_LABELS[equipment.criticality]} />
                <DetailFact label="Patrimônio" value={equipment.assetTag} />
                <DetailFact label="Fabricante" value={equipment.manufacturer} />
                <DetailFact label="Modelo" value={equipment.model} />
                <DetailFact label="Número de série" value={equipment.serialNumber} />
                <DetailFact label="Localização" value={equipment.location} />
                <DetailFact label="Instalação" value={formatDate(equipment.installationDate)} />
              </dl>
              {equipment.notes ? <div className="mt-4 border-t border-slate-100 pt-3"><p className="text-[10px] text-slate-400">Observações</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-700">{equipment.notes}</p></div> : null}
            </section>

            <section className="rounded-xl border border-slate-200 p-3.5">
              <div className="flex items-center gap-2 text-slate-700"><FileText aria-hidden="true" className="size-4 text-brand-primary" /><h3 className="text-xs font-semibold">Manual do equipamento</h3></div>
              {equipment.manualFileName ? <>
                <p className="mt-2 break-all text-[11px] text-slate-600">{equipment.manualFileName}</p>
                {manualError ? <p role="alert" className="mt-2 text-[11px] text-rose-700">{manualError}</p> : null}
              </> : <p className="mt-2 text-[11px] text-slate-500">Nenhum manual cadastrado.</p>}
            </section>
          </aside>

          <section className="flex min-h-[58dvh] flex-col p-3 sm:p-4 lg:min-h-0">
            {equipment.manualFileName ? manualLoading ? (
              <div role="status" className="flex min-h-64 flex-1 items-center justify-center text-sm text-slate-500">Carregando manual…</div>
            ) : manualUrl ? (
              <iframe title={`Manual PDF de ${equipment.name}`} src={manualUrl} className="min-h-[64dvh] flex-1 rounded-lg border border-slate-200 lg:min-h-0" />
            ) : (
              <div className="flex min-h-64 flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200 px-6 text-center text-sm text-slate-500">{manualError || "Não foi possível exibir o PDF."}</div>
            ) : (
              <div className="flex min-h-64 flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200 px-6 text-center text-sm text-slate-500">Este equipamento ainda não tem manual PDF.</div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

function DetailFact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return <div className="min-w-0"><dt className="text-[10px] text-slate-400">{label}</dt><dd className="mt-0.5 break-words text-xs font-medium text-slate-700">{value}</dd></div>;
}

function formatDate(value: string | null): string | null {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : null;
}

function formatLimit(value: number | null): string | null {
  return value === null ? null : `${value.toLocaleString("pt-BR")} °C`;
}
