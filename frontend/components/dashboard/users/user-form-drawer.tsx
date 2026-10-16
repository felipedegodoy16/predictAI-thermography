"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { X } from "lucide-react";

export type UserRole = "ADMIN" | "GESTOR" | "TECNICO";
export type UserModule = "ordens" | "equipamentos" | "relatorios" | "usuarios";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  job: string;
  role: UserRole;
  active: boolean;
  lastAccess: string;
  modules: UserModule[];
}

const formSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome completo."),
  email: z.email("Informe um e-mail válido."),
  role: z.enum(["ADMIN", "GESTOR", "TECNICO"]),
  job: z.string().trim().min(2, "Informe o cargo ou departamento."),
  modules: z.array(z.enum(["ordens", "equipamentos", "relatorios", "usuarios"])).min(1, "Selecione ao menos um módulo."),
  active: z.boolean(),
});

type UserFormValues = z.infer<typeof formSchema>;

const modules: { id: UserModule; label: string; detail: string }[] = [
  { id: "ordens", label: "Ordens de serviço", detail: "Abertura e acompanhamento de atividades" },
  { id: "equipamentos", label: "Equipamentos", detail: "Cadastro e histórico dos ativos" },
  { id: "relatorios", label: "Relatórios", detail: "Indicadores de manutenção" },
  { id: "usuarios", label: "Usuários", detail: "Acesso à gestão de contas" },
];

const defaultModules: UserModule[] = ["ordens"];

export function UserFormDrawer({
  user,
  onClose,
  onSave,
}: {
  user?: ManagedUser;
  onClose: () => void;
  onSave: (value: Omit<ManagedUser, "id" | "lastAccess">) => void;
}) {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: user
      ? { name: user.name, email: user.email, role: user.role, job: user.job, modules: user.modules, active: user.active }
      : { name: "", email: "", role: "TECNICO", job: "", modules: defaultModules, active: true },
  });
  const selectedModules = form.watch("modules");

  function toggleModule(module: UserModule) {
    const current = selectedModules ?? [];
    form.setValue("modules", current.includes(module) ? current.filter((item) => item !== module) : [...current, module], { shouldValidate: true, shouldDirty: true });
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside role="dialog" aria-modal="true" aria-labelledby="user-form-title" className="absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-100 px-5 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-primary-light">Acesso à plataforma</p>
            <h2 id="user-form-title" className="mt-1 text-lg font-semibold text-slate-900">{user ? "Editar usuário" : "Novo usuário"}</h2>
            <p className="mt-1 text-xs text-slate-500">Defina o perfil, o cargo e os módulos disponíveis.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar formulário" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="size-5" /></button>
        </header>

        <form onSubmit={form.handleSubmit((values) => onSave(values))} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <Field label="Nome completo" id="user-name" error={form.formState.errors.name?.message}>
              <input id="user-name" autoFocus placeholder="Digite o nome completo" {...form.register("name")} className={inputClass} />
            </Field>
            <Field label="E-mail corporativo" id="user-email" error={form.formState.errors.email?.message}>
              <input id="user-email" type="email" placeholder="nome@empresa.com" {...form.register("email")} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Perfil de acesso" id="user-role" error={form.formState.errors.role?.message}>
                <select id="user-role" {...form.register("role")} className={inputClass}>
                  <option value="ADMIN">Administrador</option>
                  <option value="GESTOR">Gestor</option>
                  <option value="TECNICO">Técnico</option>
                </select>
              </Field>
              <Field label="Cargo / setor" id="user-job" error={form.formState.errors.job?.message}>
                <input id="user-job" placeholder="Ex.: Manutenção" {...form.register("job")} className={inputClass} />
              </Field>
            </div>

            <fieldset>
              <legend className="text-xs font-semibold text-slate-700">Módulos permitidos</legend>
              <div className="mt-2 space-y-1.5">
                {modules.map((module) => (
                  <label key={module.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-brand-primary/30 hover:bg-teal-50/40">
                    <input type="checkbox" checked={selectedModules?.includes(module.id) ?? false} onChange={() => toggleModule(module.id)} className="mt-0.5 size-4 accent-brand-primary" />
                    <span><span className="block text-xs font-medium text-slate-700">{module.label}</span><span className="mt-0.5 block text-[10px] text-slate-500">{module.detail}</span></span>
                  </label>
                ))}
              </div>
              {form.formState.errors.modules ? <p role="alert" className="mt-1.5 text-[11px] text-rose-600">{form.formState.errors.modules.message}</p> : null}
            </fieldset>

            <fieldset>
              <legend className="text-xs font-semibold text-slate-700">Status da conta</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {([true, false] as const).map((active) => (
                  <label key={String(active)} className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition ${form.watch("active") === active ? active ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-300 bg-slate-100 text-slate-700" : "border-slate-200 text-slate-500"}`}>
                    <input type="radio" value={String(active)} checked={form.watch("active") === active} onChange={() => form.setValue("active", active, { shouldDirty: true })} className="sr-only" />
                    <span className={`size-2 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />{active ? "Ativo" : "Inativo"}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-slate-200 px-5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="submit" className="min-h-11 rounded-lg bg-brand-primary px-6 text-sm font-semibold text-white hover:bg-brand-primary-hover">Salvar usuário</button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-slate-700">{label}</label>
      {children}
      {error ? <p role="alert" className="mt-1 text-[11px] text-rose-600">{error}</p> : null}
    </div>
  );
}

const inputClass = "min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10";
