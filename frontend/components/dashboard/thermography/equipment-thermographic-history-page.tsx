"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowLeft, Eye, EyeOff, Flame, Image, Square, Thermometer, X } from "lucide-react";
import {
  getThermographicImageAsset,
  listEquipments,
  listThermographicImages,
  measureThermographicRegion,
  type Equipment,
  type ThermographicImage,
  type ThermographicRegionMeasurement,
} from "@/lib/api";

type Region = { x: number; y: number; width: number; height: number };

export function EquipmentThermographicHistoryPage({ equipmentId }: { equipmentId: number }) {
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [images, setImages] = useState<ThermographicImage[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [normalUrl, setNormalUrl] = useState("");
  const [overlayUrl, setOverlayUrl] = useState("");
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [region, setRegion] = useState<Region | null>(null);
  const [measurement, setMeasurement] = useState<ThermographicRegionMeasurement | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const [regionError, setRegionError] = useState("");
  const stageRef = useRef<HTMLDivElement>(null);
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!Number.isSafeInteger(equipmentId) || equipmentId <= 0) {
      setError("O equipamento solicitado não é válido.");
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([listEquipments({ limit: 100 }), listThermographicImages(equipmentId)])
      .then(([equipmentRows, imageRows]) => {
        if (!active) return;
        const selectedEquipment = equipmentRows.find((item) => item.id === equipmentId);
        if (!selectedEquipment) {
          setError("Equipamento não encontrado.");
          return;
        }
        setEquipment(selectedEquipment);
        setImages(imageRows);
        setSelectedId(imageRows[0]?.id ?? null);
        setError("");
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o histórico termográfico.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [equipmentId]);

  const selectedImage = images.find((image) => image.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedImage) {
      setNormalUrl("");
      setOverlayUrl("");
      setOverlayVisible(false);
      return;
    }
    let active = true;
    let normalObjectUrl = "";
    let overlayObjectUrl = "";
    setImageLoading(true);
    setError("");
    setOverlayVisible(false);
    setSelectMode(false);
    setRegion(null);
    setMeasurement(null);
    setRegionError("");
    Promise.all([
      getThermographicImageAsset(selectedImage.id, "normal"),
      getThermographicImageAsset(selectedImage.id, "sobreposicao"),
    ])
      .then(([normalBlob, overlayBlob]) => {
        if (!active) return;
        normalObjectUrl = URL.createObjectURL(normalBlob);
        overlayObjectUrl = URL.createObjectURL(overlayBlob);
        setNormalUrl(normalObjectUrl);
        setOverlayUrl(overlayObjectUrl);
        const oldRegistration = selectedImage.metadata.overlay_registration;
        if (!hasCurrentThermalRegistration(oldRegistration)) {
          void listThermographicImages(equipmentId).then((refreshedImages) => {
            if (active) setImages(refreshedImages);
          }).catch(() => undefined);
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Não foi possível abrir a imagem termográfica.");
      })
      .finally(() => { if (active) setImageLoading(false); });
    return () => {
      active = false;
      if (normalObjectUrl) URL.revokeObjectURL(normalObjectUrl);
      if (overlayObjectUrl) URL.revokeObjectURL(overlayObjectUrl);
    };
  }, [selectedImage]);

  const savedRegistration = selectedImage?.metadata.overlay_registration;
  const registration = hasCurrentThermalRegistration(savedRegistration) ? savedRegistration : undefined;
  const visibleWidth = registration?.visible_width ?? selectedImage?.metadata.resolution.width ?? 640;
  const visibleHeight = registration?.visible_height ?? selectedImage?.metadata.resolution.height ?? 480;
  const aspectRatio = visibleWidth / visibleHeight;
  const status = selectedImage?.metadata.thermal_status;
  const statusStyle = status === "URGENTE"
    ? "border-rose-200 bg-rose-50 text-rose-800"
    : status === "ALERTA"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";
  const statusLabel = status === "URGENTE" ? "Urgente" : status === "ALERTA" ? "Alerta" : "Dentro dos limites";

  function pointerPosition(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(visibleWidth, (event.clientX - bounds.left) / bounds.width * visibleWidth)),
      y: Math.max(0, Math.min(visibleHeight, (event.clientY - bounds.top) / bounds.height * visibleHeight)),
    };
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!selectMode || !registration) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointerPosition(event);
    dragOrigin.current = point;
    setRegion({ ...point, width: 0, height: 0 });
    setMeasurement(null);
    setRegionError("");
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!selectMode || !registration || !dragOrigin.current) return;
    const point = pointerPosition(event);
    const origin = dragOrigin.current;
    const directionX = point.x < origin.x ? -1 : 1;
    const directionY = point.y < origin.y ? -1 : 1;
    const side = Math.min(
      Math.max(Math.abs(point.x - origin.x), Math.abs(point.y - origin.y)),
      directionX > 0 ? visibleWidth - origin.x : origin.x,
      directionY > 0 ? visibleHeight - origin.y : origin.y,
    );
    setRegion({
      x: directionX > 0 ? origin.x : origin.x - side,
      y: directionY > 0 ? origin.y : origin.y - side,
      width: side,
      height: side,
    });
  }

  function handlePointerUp() {
    dragOrigin.current = null;
  }

  async function measureRegion() {
    if (!selectedImage || !region || region.width < 2 || region.height < 2) {
      setRegionError("Desenhe uma área quadrada sobre a imagem para medir.");
      return;
    }
    setMeasuring(true);
    setRegionError("");
    try {
      const result = await measureThermographicRegion(selectedImage.id, region);
      setMeasurement(result);
    } catch (measurementError) {
      setMeasurement(null);
      setRegionError(measurementError instanceof Error ? measurementError.message : "Não foi possível medir a região selecionada.");
    } finally {
      setMeasuring(false);
    }
  }

  function clearRegion() {
    setRegion(null);
    setMeasurement(null);
    setRegionError("");
  }

  return (
    <div className="space-y-4">
      <Link href="/equipamentos" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-slate-600 hover:bg-white hover:text-brand-primary">
        <ArrowLeft aria-hidden="true" className="size-4" /> Voltar para equipamentos
      </Link>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] text-slate-500">{equipment?.code ?? ""}</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">{equipment?.name ?? "Histórico termográfico"}</h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">Imagens e medições registradas para este equipamento.</p>
        </div>
        <Link href={`/imagens-termograficas?equipamento_id=${equipmentId}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-primary px-3.5 text-xs font-semibold text-white hover:bg-brand-primary-hover">
          <Image aria-hidden="true" className="size-4" /> Adicionar imagem IS2
        </Link>
      </header>

      {error && !selectedImage ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800">{error}</p> : null}

      {loading ? (
        <div role="status" className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Carregando histórico…</div>
      ) : images.length === 0 && equipment ? (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
          <Thermometer aria-hidden="true" className="mx-auto size-8 text-slate-400" />
          <h2 className="mt-3 text-sm font-semibold text-slate-800">Ainda não há imagens termográficas</h2>
          <p className="mt-1 text-xs text-slate-500">Envie um arquivo IS2 para criar o primeiro registro deste equipamento.</p>
          <Link href={`/imagens-termograficas?equipamento_id=${equipmentId}`} className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-brand-primary px-4 text-xs font-semibold text-white hover:bg-brand-primary-hover">Enviar arquivo IS2</Link>
        </section>
      ) : selectedImage ? (
        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-3.5 py-3">
              <h2 className="text-xs font-semibold text-slate-800">Registros de imagem</h2>
              <p className="mt-0.5 text-[10px] text-slate-500">{images.length} captura{images.length === 1 ? "" : "s"}</p>
            </div>
            <ul className="max-h-[68dvh] divide-y divide-slate-100 overflow-y-auto">
              {images.map((image) => {
                const active = image.id === selectedImage.id;
                const level = image.metadata.thermal_status;
                return (
                  <li key={image.id}>
                    <button type="button" aria-current={active ? "true" : undefined} onClick={() => setSelectedId(image.id)} className={`w-full px-3.5 py-3 text-left transition ${active ? "bg-teal-50" : "hover:bg-slate-50"}`}>
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-slate-800">{formatDate(image.createdAt)}</span>
                          <span className="mt-0.5 block truncate text-[10px] text-slate-500" title={image.originalFileName}>{image.originalFileName}</span>
                        </span>
                        <span className={`mt-0.5 size-2.5 shrink-0 rounded-full ${level === "URGENTE" ? "bg-rose-500" : level === "ALERTA" ? "bg-amber-400" : "bg-emerald-500"}`} aria-label={level} title={level} />
                      </span>
                      <span className="mt-2 block text-[11px] font-medium text-slate-600">Máxima {formatTemperature(image.metadata.statistics.max)} °C</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <main className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-3.5 sm:p-4">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-slate-900">{formatDate(selectedImage.createdAt)}</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">{selectedImage.metadata.resolution.width} × {selectedImage.metadata.resolution.height} px · máxima {formatTemperature(selectedImage.metadata.statistics.max)} °C</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusStyle}`}>
                  <Flame aria-hidden="true" className="mr-1 inline size-3.5" />{statusLabel}
                </span>
                <button
                  type="button"
                  disabled={!overlayUrl || selectMode}
                  aria-pressed={overlayVisible}
                  onClick={() => setOverlayVisible((visible) => !visible)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-700 hover:border-brand-primary/40 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {overlayVisible ? <EyeOff aria-hidden="true" className="size-3.5" /> : <Eye aria-hidden="true" className="size-3.5" />}
                  {overlayVisible ? "Ocultar termografia" : "Sobrepor termografia"}
                </button>
              </div>
            </div>

            <div className="flex min-h-[42dvh] max-h-[72dvh] items-center justify-center overflow-hidden bg-slate-950 p-3 sm:min-h-[52dvh] sm:p-5">
              {imageLoading ? <div role="status" className="text-sm text-white/75">Carregando imagem…</div> : normalUrl ? (
                <div
                  ref={stageRef}
                  className={`relative max-h-[68dvh] shrink-0 touch-none ${selectMode ? "cursor-crosshair" : ""}`}
                  style={{ aspectRatio: `${visibleWidth} / ${visibleHeight}`, width: `min(100%, ${68 * aspectRatio}dvh)` }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  <img src={normalUrl} alt={`Imagem normal de ${equipment?.name ?? "equipamento"}`} draggable={false} className="absolute inset-0 size-full select-none object-fill" />
                  {overlayVisible && overlayUrl ? <img src={overlayUrl} alt="Camada térmica sobreposta à imagem normal" draggable={false} className="pointer-events-none absolute inset-0 size-full select-none object-fill" /> : null}
                  {selectMode && registration ? (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute border border-dashed border-cyan-300 bg-cyan-400/10"
                      style={{
                        left: `${registration.x / visibleWidth * 100}%`,
                        top: `${registration.y / visibleHeight * 100}%`,
                        width: `${registration.width / visibleWidth * 100}%`,
                        height: `${registration.height / visibleHeight * 100}%`,
                      }}
                    />
                  ) : null}
                  {region && region.width > 0 && region.height > 0 ? (
                    <div
                      aria-label="Área selecionada para medição"
                      className="pointer-events-none absolute border-2 border-red-500 bg-transparent shadow-[0_0_0_1px_rgba(255,255,255,0.7)]"
                      style={{
                        left: `${region.x / visibleWidth * 100}%`,
                        top: `${region.y / visibleHeight * 100}%`,
                        width: `${region.width / visibleWidth * 100}%`,
                        height: `${region.height / visibleHeight * 100}%`,
                      }}
                    />
                  ) : null}
                  {overlayVisible ? <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-slate-950/75 px-2 py-1 text-[10px] font-medium text-white">Camada termográfica · opacidade normal</span> : null}
                </div>
              ) : <div role="alert" className="px-4 text-center text-sm text-rose-200">{error || "Imagem normal indisponível."}</div>}
            </div>
            <p className="border-b border-slate-100 px-4 py-2 text-[10px] leading-4 text-slate-500">
              {selectMode ? "A área tracejada azul indica onde existem dados térmicos. Somente os pixels dessa região entram na medição; qualquer parte da seleção fora dela será ignorada." : "O recorte e a posição da camada vêm das informações de registro visual do IS2. Diferenças de perspectiva entre as câmeras ainda podem alterar levemente a posição aparente dos objetos."}
            </p>

            <section className="border-b border-slate-100 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold text-slate-800">Temperaturas da imagem</h3>
                  <p className="mt-0.5 text-[10px] text-slate-500">Resumo calculado sobre os pixels térmicos válidos.</p>
                </div>
                <button
                  type="button"
                  disabled={!registration || !overlayUrl}
                  aria-pressed={selectMode}
                  onClick={() => {
                    const next = !selectMode;
                    setSelectMode(next);
                    setOverlayVisible(next || overlayVisible);
                    setRegion(null);
                    setMeasurement(null);
                    setRegionError("");
                  }}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${selectMode ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200 text-slate-700 hover:border-brand-primary/40 hover:bg-teal-50"}`}
                >
                  {selectMode ? <X aria-hidden="true" className="size-3.5" /> : <Square aria-hidden="true" className="size-3.5" />}
                  {selectMode ? "Cancelar seleção" : "Selecionar área térmica"}
                </button>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                <Metric label="Temperatura máxima" value={`${formatTemperature(selectedImage.metadata.statistics.max)} °C`} />
                <Metric label="Temperatura mínima" value={`${formatTemperature(selectedImage.metadata.statistics.min)} °C`} />
                <Metric label="Temperatura média" value={`${formatTemperature(selectedImage.metadata.statistics.mean)} °C`} />
              </dl>
            </section>

            {selectMode || measurement || regionError ? (
              <section className="space-y-3 p-4">
                {selectMode ? <p className="text-[11px] leading-5 text-slate-600">Arraste o mouse ou o dedo sobre a imagem para desenhar um quadrado. A moldura vermelha marca a seleção; áreas sem informação térmica serão ignoradas.</p> : null}
                {region && region.width > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={measureRegion} disabled={measuring || region.width < 2} className="inline-flex min-h-9 items-center justify-center rounded-lg bg-brand-primary px-3 text-[11px] font-semibold text-white hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
                      {measuring ? "Medindo…" : "Medir área selecionada"}
                    </button>
                    <button type="button" onClick={clearRegion} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Limpar área</button>
                  </div>
                ) : null}
                {regionError ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-800">{regionError}</p> : null}
                {measurement ? (
                  <div className="rounded-lg border border-red-200 bg-red-50/60 p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-slate-800">Resultado da área selecionada</h4>
                      <span className="text-[10px] font-medium text-slate-600">{measurement.thermalCoveragePercent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% da seleção com dados térmicos · {measurement.thermalPixels.toLocaleString("pt-BR")} pixels</span>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                      <Metric label="Máxima na área" value={`${formatTemperature(measurement.maximum)} °C`} />
                      <Metric label="Mínima na área" value={`${formatTemperature(measurement.minimum)} °C`} />
                      <Metric label="Média na área" value={`${formatTemperature(measurement.mean)} °C`} />
                    </dl>
                  </div>
                ) : null}
              </section>
            ) : null}

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-xs sm:grid-cols-3">
              <Metric label="Estado térmico" value={statusLabel} />
              <Metric label="Limite de alerta" value={`${formatTemperature(selectedImage.metadata.limits_c.yellow)} °C`} />
              <Metric label="Limite OS urgente" value={`${formatTemperature(selectedImage.metadata.limits_c.red)} °C`} />
            </dl>
          </main>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-[10px] text-slate-400">{label}</dt><dd className="mt-0.5 truncate font-semibold text-slate-700">{value}</dd></div>;
}

function formatTemperature(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function hasCurrentThermalRegistration(
  registration: ThermographicImage["metadata"]["overlay_registration"],
): registration is NonNullable<ThermographicImage["metadata"]["overlay_registration"]> {
  if (!registration) return false;
  const values = [registration.x, registration.y, registration.width, registration.height, registration.visible_width, registration.visible_height];
  return values.every(Number.isFinite)
    && registration.x >= 0 && registration.y >= 0
    && registration.width > 0 && registration.height > 0
    && registration.visible_width > 0 && registration.visible_height > 0
    && registration.x + registration.width <= registration.visible_width
    && registration.y + registration.height <= registration.visible_height;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
