"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { FileUp, X } from "lucide-react";
import { createEquipment, type EquipmentCriticality, type EquipmentInput, type EquipmentTypeOption } from "@/lib/api";

const inputClass = "min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10";

export function EquipmentCreateDrawer({
  types,
  onClose,
  onCreated,
}: {
  types: EquipmentTypeOption[];
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [equipmentType, setEquipmentType] = useState(types[0]?.equipmentType ?? "MOTOR_ELETRICO");
  const [specifications, setSpecifications] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [manual, setManual] = useState<File>();

  const selectedType = types.find((type) => type.equipmentType === equipmentType);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const input: EquipmentInput = {
      name: String(form.get("name") ?? "").trim(),
      equipmentType,
      manufacturer: optionalValue(form, "manufacturer"),
      model: optionalValue(form, "model"),
      serialNumber: optionalValue(form, "serialNumber"),
      assetTag: optionalValue(form, "assetTag"),
      location: optionalValue(form, "location"),
      criticality: String(form.get("criticality") ?? "MEDIA") as EquipmentCriticality,
      installationDate: optionalValue(form, "installationDate"),
      notes: optionalValue(form, "notes"),
      specifications: Object.fromEntries(
        Object.entries(specifications)
          .filter(([, value]) => value.trim() !== "")
          .map(([key, value]) => [key, Number(value)]),
      ),
    };

    try {
      await createEquipment(input, manual);
      await onCreated();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível cadastrar o equipamento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-5">
      <section role="dialog" aria-modal="true" aria-labelledby="equipment-create-title" className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <header className="flex items-start justify-between border-b border-slate-100 px-4 py-3.5 sm:px-6 sm:py-4">
          <div>
            <h2 id="equipment-create-title" className="text-lg font-semibold text-slate-900">Cadastrar equipamento</h2>
            <p className="mt-0.5 text-xs text-slate-500">Os campos técnicos mudam conforme o tipo escolhido.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar cadastro" className="flex size-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>

        <form onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-4 overflow-y-auto p-4 sm:space-y-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome do equipamento" required>
                <input name="name" required minLength={2} maxLength={200} autoFocus placeholder="Ex.: Motor da bomba principal" className={inputClass} />
              </Field>
              <Field label="Tipo" required>
                <select
                  name="equipmentType"
                  required
                  value={equipmentType}
                  onChange={(event) => {
                    setEquipmentType(event.target.value as typeof equipmentType);
                    setSpecifications({});
                  }}
                  className={inputClass}
                >
                  {types.map((type) => <option key={type.equipmentType} value={type.equipmentType}>{type.label}</option>)}
                </select>
              </Field>
              <Field label="Fabricante">
                <input name="manufacturer" maxLength={120} className={inputClass} />
              </Field>
              <Field label="Modelo">
                <input name="model" maxLength={120} className={inputClass} />
              </Field>
              <Field label="Número de série">
                <input name="serialNumber" maxLength={120} className={inputClass} />
              </Field>
              <Field label="Código patrimonial">
                <input name="assetTag" maxLength={80} className={inputClass} />
              </Field>
              <Field label="Localização">
                <input name="location" maxLength={200} placeholder="Ex.: Casa de bombas · Setor A" className={inputClass} />
              </Field>
              <Field label="Criticidade">
                <select name="criticality" defaultValue="MEDIA" className={inputClass}>
                  <option value="BAIXA">Baixa</option>
                  <option value="MEDIA">Média</option>
                  <option value="ALTA">Alta</option>
                  <option value="CRITICA">Crítica</option>
                </select>
              </Field>
              <Field label="Data de instalação">
                <input name="installationDate" type="date" className={inputClass} />
              </Field>
            </div>

            {selectedType?.fields.length ? (
              <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3.5 sm:p-4">
                <legend className="px-1 text-xs font-semibold text-slate-700">Dados técnicos · {selectedType.label}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedType.fields.map((field) => (
                    <Field key={field.key} label={field.label} unit={field.unit}>
                      <input
                        type="number"
                        min={field.key === "phase_count" ? "1" : "0.000001"}
                        step={field.key === "phase_count" ? "1" : "any"}
                        inputMode="decimal"
                        value={specifications[field.key] ?? ""}
                        onChange={(event) => setSpecifications((current) => ({ ...current, [field.key]: event.target.value }))}
                        className={inputClass}
                      />
                    </Field>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <Field label="Observações">
              <textarea name="notes" rows={3} maxLength={2000} className={`${inputClass} resize-y py-2.5`} />
            </Field>
            <div>
              <label htmlFor="equipment-manual" className="mb-1.5 block text-xs font-medium text-slate-700">Manual do equipamento (PDF, até 25 MB)</label>
              <label htmlFor="equipment-manual" className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 hover:border-brand-primary hover:bg-teal-50/40">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-brand-primary"><FileUp aria-hidden="true" className="size-4" /></span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-slate-700">{manual?.name ?? "Selecionar arquivo PDF"}</span>
                  <span className="mt-0.5 block text-[11px] text-slate-500">A orientação da IA lê o texto do PDF; prefira um manual pesquisável.</span>
                </span>
                <input id="equipment-manual" type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(event) => setManual(event.target.files?.[0])} />
              </label>
            </div>
            {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800">{error}</p> : null}
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-white p-4 sm:flex-row sm:justify-end sm:px-6">
            <button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={saving || types.length === 0} className="min-h-11 rounded-lg bg-brand-primary px-5 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60">
              {saving ? "Salvando…" : "Salvar equipamento"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function optionalValue(form: FormData, key: string): string | undefined {
  const value = String(form.get(key) ?? "").trim();
  return value || undefined;
}

function Field({
  label,
  required = false,
  unit,
  children,
}: {
  label: string;
  required?: boolean;
  unit?: string;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0 text-xs font-medium text-slate-700">
      <span className="mb-1.5 block">{label}{required ? " *" : ""}{unit ? <span className="ml-1 text-slate-400">({unit})</span> : null}</span>
      {children}
    </label>
  );
}
