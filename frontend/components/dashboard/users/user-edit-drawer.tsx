"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { X } from "lucide-react";
import type { User, UserUpdateInput } from "@/lib/api";

const formSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres."),
  email: z.email("Informe um endereço de e-mail válido."),
});

type UserFormValues = z.infer<typeof formSchema>;

export function UserEditDrawer({
  user,
  onClose,
  onSave,
}: {
  user: User;
  onClose: () => void;
  onSave: (value: UserUpdateInput) => Promise<void>;
}) {
  const [saveError, setSaveError] = useState<string>();
  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: user.name, email: user.email },
  });

  async function submit(values: UserFormValues) {
    setSaveError(undefined);
    try {
      await onSave(values);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar as alterações.",
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (!form.formState.isSubmitting && event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-edit-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between border-b border-slate-100 px-5 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-primary-light">
              Cadastro da conta
            </p>
            <h2 id="user-edit-title" className="mt-1 text-lg font-semibold text-slate-900">
              Editar usuário
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Atualize os dados básicos deste cadastro.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={form.formState.isSubmitting}
            aria-label="Fechar formulário"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </header>

        <form
          onSubmit={form.handleSubmit(submit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 px-5 py-5">
            <Field
              label="Nome completo"
              id="user-name"
              error={form.formState.errors.name?.message}
            >
              <input
                id="user-name"
                autoFocus
                autoComplete="name"
                {...form.register("name")}
                className={inputClass}
              />
            </Field>
            <Field
              label="E-mail"
              id="user-email"
              error={form.formState.errors.email?.message}
            >
              <input
                id="user-email"
                type="email"
                autoComplete="email"
                {...form.register("email")}
                className={inputClass}
              />
            </Field>
            {saveError ? (
              <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800">
                {saveError}
              </p>
            ) : null}
            <p className="text-[11px] leading-5 text-slate-500">
              Alterações de perfil e permissões não fazem parte deste formulário.
            </p>
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={form.formState.isSubmitting}
              className="min-h-10 rounded-lg border border-slate-200 px-4 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand-primary px-4 text-xs font-semibold text-white transition hover:bg-brand-primary-hover disabled:cursor-wait disabled:opacity-60"
            >
              {form.formState.isSubmitting ? "Salvando…" : "Salvar alterações"}
            </button>
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
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error ? <p role="alert" className="mt-1 text-[11px] text-rose-600">{error}</p> : null}
    </div>
  );
}

const inputClass =
  "min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10";
