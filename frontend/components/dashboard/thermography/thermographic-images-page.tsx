"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { FileImage, FileUp, Flame, ImageUp, X } from "lucide-react";
import { toast } from "sonner";
import {
  getThermographicImageAsset,
  listEquipments,
  listThermographicImages,
  uploadThermographicImage,
  type Equipment,
  type ThermographicImage,
} from "@/lib/api";

const inputClass = "min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10";

export function ThermographicImagesPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [equipmentId, setEquipmentId] = useState("");
  const [images, setImages] = useState<ThermographicImage[]>([]);
  const [previews, setPreviews] = useState<Record<number, { normal: string; thermal: string }>>({});
  const [file, setFile] = useState<File | null>(null);
  const [draggingFile, setDraggingFile] = useState(false);
  const [loadingEquipment, setLoadingEquipment] = useState(true);
  const [loadingImages, setLoadingImages] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    listEquipments({ limit: 100 })
      .then((rows) => {
        if (!active) return;
        setEquipment(rows);
        const requestedEquipmentId = new URLSearchParams(window.location.search).get("equipamento_id");
        if (requestedEquipmentId && rows.some((item) => String(item.id) === requestedEquipmentId)) {
          setEquipmentId(requestedEquipmentId);
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os equipamentos.");
      })
      .finally(() => { if (active) setLoadingEquipment(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!equipmentId) {
      setImages([]);
      setLoadingImages(false);
      return;
    }
    let active = true;
    setLoadingImages(true);
    listThermographicImages(Number(equipmentId))
      .then((rows) => { if (active) setImages(rows); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar as imagens termográficas.");
      })
      .finally(() => { if (active) setLoadingImages(false); });
    return () => { active = false; };
  }, [equipmentId]);

  useEffect(() => {
    let active = true;
    const objectUrls: string[] = [];
    void Promise.all(images.map(async (image) => {
      const [normal, thermal] = await Promise.all([
        getThermographicImageAsset(image.id, "normal"),
        getThermographicImageAsset(image.id, "termica"),
      ]);
      const normalUrl = URL.createObjectURL(normal);
      const thermalUrl = URL.createObjectURL(thermal);
      objectUrls.push(normalUrl, thermalUrl);
      return [image.id, { normal: normalUrl, thermal: thermalUrl }] as const;
    }))
      .then((entries) => { if (active) setPreviews(Object.fromEntries(entries)); })
      .catch((previewError: unknown) => {
        if (active) setError(previewError instanceof Error ? previewError.message : "Não foi possível abrir as imagens.");
      });
    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!equipmentId || !file) return;
    if (file.size > 50 * 1024 * 1024) {
      setError("O arquivo IS2 deve ter no máximo 50 MB.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadThermographicImage(Number(equipmentId), file);
      setImages((current) => [uploaded, ...current]);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Imagem termográfica processada e vinculada ao equipamento.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Não foi possível processar o arquivo IS2.");
    } finally {
      setUploading(false);
    }
  }

  const noEquipment = !loadingEquipment && equipment.length === 0;
  const selectedEquipment = equipment.find((item) => String(item.id) === equipmentId);
  const selectedEquipmentHasLimits = selectedEquipment?.yellowLimitC !== null
    && selectedEquipment?.yellowLimitC !== undefined
    && selectedEquipment?.redLimitC !== null
    && selectedEquipment?.redLimitC !== undefined;

  function selectIs2File(candidate?: File) {
    if (!candidate) return;
    if (!candidate.name.toLowerCase().endsWith(".is2")) {
      setFile(null);
      setError("Selecione um arquivo com extensão .IS2.");
      return;
    }
    if (candidate.size > 50 * 1024 * 1024) {
      setFile(null);
      setError("O arquivo IS2 deve ter no máximo 50 MB.");
      return;
    }
    setError("");
    setFile(candidate);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Imagens termográficas</h1>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">Envie arquivos IS2 para extrair a matriz radiométrica e comparar a temperatura máxima com os limites do equipamento.</p>
      </header>

      {noEquipment ? (
        <section className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
          {error ? <p role="alert" className="mb-3 text-xs text-rose-700">{error}</p> : null}
          <FileImage aria-hidden="true" className="mx-auto size-8 text-brand-primary" />
          <h2 className="mt-3 text-sm font-semibold text-slate-800">Cadastre um equipamento primeiro</h2>
          <p className="mt-1 text-xs text-slate-500">A imagem precisa ser vinculada a um equipamento com limites de temperatura configurados.</p>
        </section>
      ) : (
        <>
          <form onSubmit={(event) => void handleUpload(event)} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 lg:grid-cols-[minmax(240px,1fr)_auto] lg:items-end">
            <fieldset className="min-w-0 lg:col-span-2">
              <legend className="mb-2 block text-xs font-medium text-slate-700">Selecione o equipamento ao qual a imagem pertence *</legend>
              {loadingEquipment ? (
                <p role="status" className="rounded-lg border border-slate-200 px-3 py-4 text-xs text-slate-500">Carregando equipamentos…</p>
              ) : (
                <div className="grid max-h-60 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                  {equipment.map((item) => {
                    const selected = equipmentId === String(item.id);
                    const hasLimits = item.yellowLimitC !== null && item.redLimitC !== null;
                    return (
                      <label key={item.id} className={`flex min-h-16 cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition ${selected ? "border-brand-primary bg-teal-50 ring-2 ring-brand-primary/15" : "border-slate-200 hover:border-brand-primary/40 hover:bg-slate-50"}`}>
                        <input
                          type="radio"
                          name="equipment"
                          value={item.id}
                          checked={selected}
                          required
                          onChange={() => { setError(""); setFile(null); setEquipmentId(String(item.id)); }}
                          className="mt-0.5 size-4 shrink-0 accent-brand-primary"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-slate-800">{item.name}</span>
                          <span className="mt-0.5 block truncate text-[10px] text-slate-500">{item.code} · {item.manufacturer ?? "Fabricante não informado"}</span>
                          <span className={`mt-1 block text-[10px] ${hasLimits ? "text-slate-600" : "font-medium text-amber-800"}`}>
                            {hasLimits
                              ? `Alerta ${item.yellowLimitC?.toLocaleString("pt-BR")} °C · Urgente ${item.redLimitC?.toLocaleString("pt-BR")} °C`
                              : "Configure os limites de temperatura"}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </fieldset>
            <div className="min-w-0 text-xs font-medium text-slate-700">
              <span className="mb-1.5 block">Arquivo de termografia (.IS2, até 50 MB) *</span>
              <div
                onDragOver={(event) => { event.preventDefault(); if (equipmentId) setDraggingFile(true); }}
                onDragLeave={() => setDraggingFile(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDraggingFile(false);
                  if (equipmentId) selectIs2File(event.dataTransfer.files?.[0]);
                }}
                className={`flex min-h-[104px] items-center gap-3 rounded-xl border border-dashed px-3 py-3 transition sm:px-4 ${!equipmentId ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400" : draggingFile ? "border-brand-primary bg-teal-50 ring-2 ring-brand-primary/15" : "border-slate-300 bg-white hover:border-brand-primary/60 hover:bg-teal-50/30"}`}
              >
                <input
                  ref={fileInputRef}
                  id="thermography-is2-file"
                  required
                  type="file"
                  accept=".is2,application/octet-stream"
                  disabled={!equipmentId}
                  onChange={(event) => selectIs2File(event.target.files?.[0])}
                  className="sr-only"
                />
                <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${equipmentId ? "bg-teal-50 text-brand-primary" : "bg-slate-100 text-slate-400"}`}>
                  <FileUp aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  {file ? (
                    <>
                      <span className="block truncate text-xs font-semibold text-slate-800" title={file.name}>{file.name}</span>
                      <span className="mt-1 block text-[11px] text-slate-500">{formatFileSize(file.size)} · pronto para processamento</span>
                    </>
                  ) : (
                    <>
                      <span className="block text-xs font-semibold text-slate-800">{equipmentId ? "Arraste o arquivo .IS2 até aqui" : "Selecione um equipamento primeiro"}</span>
                      <span className="mt-1 block text-[11px] font-normal text-slate-500">{equipmentId ? "ou escolha no seu dispositivo · máximo 50 MB" : "A escolha do arquivo será habilitada após selecionar o equipamento."}</span>
                    </>
                  )}
                </span>
                {file ? (
                  <button type="button" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} aria-label="Remover arquivo selecionado" className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                    <X aria-hidden="true" className="size-4" />
                  </button>
                ) : (
                  <button type="button" disabled={!equipmentId} onClick={() => fileInputRef.current?.click()} className="min-h-9 shrink-0 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:border-brand-primary hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-50">
                    Escolher arquivo
                  </button>
                )}
              </div>
            </div>
            <button type="submit" disabled={!equipmentId || !selectedEquipmentHasLimits || !file || uploading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
              <ImageUp aria-hidden="true" className="size-4" />{uploading ? "Processando…" : "Enviar e analisar"}
            </button>
            {selectedEquipment && !selectedEquipmentHasLimits ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 lg:col-span-2">
                O equipamento <strong>{selectedEquipment.name}</strong> ainda não tem limites amarelo e vermelho. Configure-os no cadastro antes de enviar imagens.
              </p>
            ) : null}
            {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800 lg:col-span-3">{error}</p> : null}
          </form>

          <section aria-live="polite" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Imagens do equipamento</h2>
              <span className="text-xs text-slate-500">{loadingImages ? "Carregando…" : `${images.length} imagem${images.length === 1 ? "" : "s"}`}</span>
            </div>
            {loadingImages ? (
              <div role="status" className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Carregando imagens…</div>
            ) : images.length ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {images.map((image) => <ThermographicImageCard key={image.id} image={image} preview={previews[image.id]} />)}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
                <FileImage aria-hidden="true" className="mx-auto size-8 text-slate-400" />
                <p className="mt-2 text-sm font-medium text-slate-700">Nenhuma imagem termográfica para este equipamento</p>
                <p className="mt-1 text-xs text-slate-500">Selecione um arquivo IS2 acima para começar.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function ThermographicImageCard({ image, preview }: { image: ThermographicImage; preview?: { normal: string; thermal: string } }) {
  const status = image.metadata.thermal_status;
  const statusLabel = status === "URGENTE" ? "Urgente · limite vermelho" : status === "ALERTA" ? "Alerta · limite amarelo" : "Dentro dos limites";
  const statusStyle = status === "URGENTE" ? "border-rose-200 bg-rose-50 text-rose-800" : status === "ALERTA" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800";

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 p-3.5 sm:p-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-900">{image.originalFileName}</h3>
          <p className="mt-1 text-[11px] text-slate-500">{formatDate(image.createdAt)} · {image.metadata.resolution.width} × {image.metadata.resolution.height} px</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusStyle}`}>
          <Flame aria-hidden="true" className="size-3.5" />{statusLabel}
        </span>
      </header>
      <div className="grid grid-cols-2 gap-px bg-slate-100">
        <div className="bg-slate-50">
          <p className="px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Imagem normal</p>
          {preview ? <img src={preview.normal} alt={`Imagem normal de ${image.equipmentName}`} className="aspect-[4/3] w-full object-contain" /> : <ImagePlaceholder />}
        </div>
        <div className="bg-slate-50">
          <p className="px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Imagem térmica</p>
          {preview ? <img src={preview.thermal} alt={`Imagem termográfica de ${image.equipmentName}`} className="aspect-[4/3] w-full object-contain" /> : <ImagePlaceholder />}
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-2 p-3.5 text-[11px] sm:p-4">
        <Metric label="Máxima" value={`${formatTemperature(image.metadata.statistics.max)} °C`} />
        <Metric label="Média" value={`${formatTemperature(image.metadata.statistics.mean)} °C`} />
        <Metric label="Mínima" value={`${formatTemperature(image.metadata.statistics.min)} °C`} />
        <Metric label="Emissividade" value={image.metadata.parameters.emissivity.toLocaleString("pt-BR")} />
        <Metric label="Refletida" value={`${formatTemperature(image.metadata.parameters.reflected_temp)} °C`} />
        <Metric label="Transmissão" value={image.metadata.parameters.transmission.toLocaleString("pt-BR")} />
        <Metric label="Limite amarelo" value={`${formatTemperature(image.metadata.limits_c.yellow)} °C`} />
        <Metric label="Limite vermelho" value={`${formatTemperature(image.metadata.limits_c.red)} °C`} />
      </dl>
    </article>
  );
}

function ImagePlaceholder() {
  return <div className="flex aspect-[4/3] items-center justify-center text-slate-400"><FileImage aria-hidden="true" className="size-7" /></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-[10px] text-slate-400">{label}</dt><dd className="mt-0.5 truncate font-semibold text-slate-700">{value}</dd></div>;
}

function formatTemperature(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function formatFileSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
