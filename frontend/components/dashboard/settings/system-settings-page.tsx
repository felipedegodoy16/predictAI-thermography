"use client";

import { useEffect, useState } from "react";
import { Bell, Save } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  getMyNotificationSettings,
  updateMyNotificationSettings,
  type ThermalEmailSettings,
} from "@/lib/api";

const DEFAULT_SETTINGS: ThermalEmailSettings = {
  email_on_thermal_alert: false,
  email_on_thermal_alarm: false,
};

export function SystemSettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    void getMyNotificationSettings()
      .then((result) => {
        if (!active) return;
        setSettings(result);
        setSavedSettings(result);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Não foi possível carregar suas configurações.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  function changeSetting(key: keyof ThermalEmailSettings, value: boolean) {
    setSettings((current) => ({ ...current, [key]: value }));
    setError("");
    setSuccess("");
  }

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await updateMyNotificationSettings(settings);
      setSettings(updated);
      setSavedSettings(updated);
      setSuccess("Preferências de e-mail salvas.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar suas configurações.");
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = settings.email_on_thermal_alert !== savedSettings.email_on_thermal_alert
    || settings.email_on_thermal_alarm !== savedSettings.email_on_thermal_alarm;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section>
        <div className="flex items-center gap-2 text-xs font-medium text-brand-primary-light">
          <Bell aria-hidden="true" className="size-4" /> Preferências pessoais
        </div>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Configurações</h1>
        <p className="mt-1 max-w-xl text-sm text-slate-500">Escolha quais notificações do sistema você quer receber por e-mail.</p>
      </section>

      {loading ? (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          <LoadingSpinner /> Carregando suas configurações…
        </div>
      ) : error && !hasChanges ? (
        <section role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p>{error}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-3 font-semibold underline underline-offset-2">Tentar novamente</button>
        </section>
      ) : (
        <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_5px_20px_rgba(15,45,54,0.04)]">
          <header className="border-b border-slate-100 px-4 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-slate-800">Alertas por e-mail</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">As notificações são enviadas quando uma imagem termográfica ultrapassa o limite do equipamento.</p>
          </header>
          <div className="divide-y divide-slate-100 px-4 sm:px-6">
            <NotificationOption
              checked={settings.email_on_thermal_alert}
              disabled={saving}
              title="Alerta de temperatura"
              description="Receber e-mail quando a temperatura atingir o limite de alerta."
              onChange={(checked) => changeSetting("email_on_thermal_alert", checked)}
            />
            <NotificationOption
              checked={settings.email_on_thermal_alarm}
              disabled={saving}
              title="Alarme de temperatura"
              description="Receber e-mail quando a temperatura atingir o limite de alarme."
              onChange={(checked) => changeSetting("email_on_thermal_alarm", checked)}
            />
          </div>
          <footer className="border-t border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-6">
            {error ? <p role="alert" className="mb-3 text-xs text-rose-700">{error}</p> : null}
            {success ? <p role="status" className="mb-3 text-xs text-emerald-700">{success}</p> : null}
            <button type="button" onClick={() => void save()} disabled={!hasChanges || saving} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 text-xs font-semibold text-white hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? <LoadingSpinner /> : <Save aria-hidden="true" className="size-3.5" />}
              {saving ? "Salvando…" : "Salvar preferências"}
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}

function NotificationOption({
  checked,
  disabled,
  title,
  description,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  title: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-4 sm:py-5">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 size-4 shrink-0 rounded border-slate-300 accent-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-wait" />
      <span>
        <span className="block text-sm font-medium text-slate-800">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
      </span>
    </label>
  );
}
