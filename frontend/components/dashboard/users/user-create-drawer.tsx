"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { X } from "lucide-react";
import type { UserCreateInput } from "@/lib/api";

const schema = z.object({
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres."),
  email: z.email("Informe um endereço de e-mail válido."),
  password: z.string().min(12, "A senha deve ter pelo menos 12 caracteres.").max(128),
  role: z.enum(["user", "admin"]),
});
type Values = z.infer<typeof schema>;

export function UserCreateDrawer({ onClose, onSave }: {
  onClose: () => void;
  onSave: (value: UserCreateInput) => Promise<void>;
}) {
  const [saveError, setSaveError] = useState<string>();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { role: "user" } });

  async function submit(values: Values) {
    setSaveError(undefined);
    try { await onSave(values); }
    catch (error) { setSaveError(error instanceof Error ? error.message : "Não foi possível cadastrar o usuário."); }
  }

  return <div className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-[2px]" onMouseDown={(event) => {
    if (!form.formState.isSubmitting && event.target === event.currentTarget) onClose();
  }}>
    <aside role="dialog" aria-modal="true" aria-labelledby="user-create-title" className="absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col bg-white shadow-2xl">
      <header className="flex items-start justify-between border-b border-slate-100 px-5 py-5">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-primary-light">Cadastro da conta</p>
          <h2 id="user-create-title" className="mt-1 text-lg font-semibold text-slate-900">Novo usuário</h2>
          <p className="mt-1 text-xs text-slate-500">Cadastre os dados e escolha o tipo de acesso.</p></div>
        <button type="button" onClick={onClose} aria-label="Fechar formulário" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="size-5" /></button>
      </header>
      <form onSubmit={form.handleSubmit(submit)} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 px-5 py-5">
          <Input label="Nome completo" error={form.formState.errors.name?.message}><input autoFocus autoComplete="name" {...form.register("name")} className={inputClass} /></Input>
          <Input label="E-mail" error={form.formState.errors.email?.message}><input type="email" autoComplete="email" {...form.register("email")} className={inputClass} /></Input>
          <Input label="Senha inicial" error={form.formState.errors.password?.message}><input type="password" autoComplete="new-password" {...form.register("password")} className={inputClass} /></Input>
          <Input label="Tipo de usuário"><select {...form.register("role")} className={inputClass}><option value="user">Usuário</option><option value="admin">Administrador</option></select></Input>
          {saveError ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800">{saveError}</p> : null}
        </div>
        <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={form.formState.isSubmitting} className="min-h-10 rounded-lg border border-slate-200 px-4 text-xs font-medium text-slate-600">Cancelar</button>
          <button type="submit" disabled={form.formState.isSubmitting} className="min-h-10 rounded-lg bg-brand-primary px-4 text-xs font-semibold text-white disabled:opacity-60">{form.formState.isSubmitting ? "Cadastrando…" : "Cadastrar usuário"}</button>
        </footer>
      </form>
    </aside>
  </div>;
}

function Input({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-xs font-medium text-slate-700">{label}</label>{children}{error ? <p role="alert" className="mt-1 text-[11px] text-rose-600">{error}</p> : null}</div>;
}
const inputClass = "min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10";
