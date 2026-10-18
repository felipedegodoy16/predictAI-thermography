"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarDays, Save, ShieldCheck, UserRound } from "lucide-react";
import { FormField } from "@/components/ui/form-field";
import { getMyUser, updateUser, type User } from "@/lib/api";
import { getAuthSession, saveAuthSession } from "@/lib/auth-session";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres."),
  email: z.email("Informe um endereço de e-mail válido."),
});

type ProfileValues = z.infer<typeof profileSchema>;

export function ProfilePage() {
  const [profile, setProfile] = useState<User>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [saveError, setSaveError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", email: "" },
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(undefined);
    void getMyUser()
      .then((user) => {
        if (!active) return;
        setProfile(user);
        reset({ name: user.name, email: user.email });
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : "Não foi possível carregar seu perfil.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reset]);

  async function saveProfile(values: ProfileValues) {
    if (!profile) return;
    setSaveError(undefined);
    setSaved(false);
    try {
      const updated = await updateUser(profile.id, values);
      setProfile(updated);
      const session = getAuthSession();
      if (session) {
        saveAuthSession(session, updated.email);
        window.dispatchEvent(new Event("auth-profile-updated"));
      }
      reset({ name: updated.name, email: updated.email });
      setSaved(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Não foi possível salvar as alterações.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <section>
        <div className="flex items-center gap-2 text-xs font-medium text-brand-primary-light">
          <UserRound aria-hidden="true" className="size-4" /> Minha conta
        </div>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
          Meu perfil
        </h1>
        <p className="mt-1 max-w-xl text-sm text-slate-500">
          Atualize seus dados pessoais. Outras informações poderão ser incluídas aqui futuramente.
        </p>
      </section>

      {loadError ? (
        <section role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          <p>{loadError}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-3 font-semibold underline underline-offset-2">
            Tentar novamente
          </button>
        </section>
      ) : loading ? (
        <div role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
          Carregando seu perfil…
        </div>
      ) : profile ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_5px_20px_rgba(15,45,54,0.04)]">
            <header className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <h2 className="text-sm font-semibold text-slate-800">Dados pessoais</h2>
              <p className="mt-1 text-xs text-slate-500">Edite seu nome e e-mail de acesso.</p>
            </header>
            <form onSubmit={handleSubmit(saveProfile)} className="space-y-5 p-5 sm:p-6">
              <FormField
                {...register("name")}
                label="Nome completo"
                autoComplete="name"
                required
                error={errors.name?.message}
              />
              <FormField
                {...register("email")}
                label="E-mail"
                type="email"
                autoComplete="email"
                required
                error={errors.email?.message}
              />
              {saveError ? (
                <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800">
                  {saveError}
                </p>
              ) : null}
              {saved ? (
                <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
                  Perfil atualizado com sucesso.
                </p>
              ) : null}
              <div className="flex justify-end border-t border-slate-100 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || !isDirty}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 text-xs font-semibold text-white transition hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save aria-hidden="true" className="size-3.5" />
                  {isSubmitting ? "Salvando…" : "Salvar alterações"}
                </button>
              </div>
            </form>
          </section>

          <aside className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_5px_20px_rgba(15,45,54,0.04)]">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-[#e0f2f1] text-sm font-semibold text-brand-primary">
                {getInitials(profile.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{profile.name}</p>
                <p className="truncate text-xs text-slate-500">{profile.email}</p>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <InfoRow
                icon={ShieldCheck}
                label="Tipo de conta"
                value={profile.role === "admin" ? "Administrador" : "Usuário"}
              />
              <InfoRow
                icon={CalendarDays}
                label="Membro desde"
                value={formatDate(profile.created_at)}
              />
            </div>
            <p className="text-[11px] leading-5 text-slate-500">
              O tipo de conta é gerenciado por um administrador e não pode ser alterado nesta tela.
            </p>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-2.5 last:mb-0">
      <Icon aria-hidden="true" className="mt-0.5 size-4 text-slate-400" />
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 text-xs font-medium text-slate-700">{value}</p>
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(date);
}
