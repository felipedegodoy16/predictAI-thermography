"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, RefreshCw, Trash2, X } from "lucide-react";
import { listUserOptions, type ServiceOrderInput, type UserOption } from "@/lib/api";
import { PRIORITIES } from "./constants";

const checklistSchema = z.object({
  description: z.string().trim().min(1, "Descreva esta etapa."),
  required: z.boolean(),
});

const createOrderSchema = z.object({
  title: z.string().trim().min(3, "Informe um título com pelo menos 3 caracteres.").max(200),
  description: z.string().trim().min(1, "Descreva o serviço."),
  priority: z.enum(["BAIXA", "MEDIA", "ALTA", "CRITICA"]),
  clientId: z.string().uuid("Selecione o cliente da ordem."),
  technicianId: z.union([z.literal(""), z.string().uuid("Selecione um técnico válido.")]),
  dueAt: z.string(),
  checklistItems: z.array(checklistSchema),
});

type CreateOrderValues = z.infer<typeof createOrderSchema>;

const inputClass =
  "min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10";

export function CreateOSModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: ServiceOrderInput) => Promise<void>;
}) {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string>();
  const [usersReloadKey, setUsersReloadKey] = useState(0);
  const form = useForm<CreateOrderValues>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "MEDIA",
      clientId: "",
      technicianId: "",
      dueAt: "",
      checklistItems: [{ description: "", required: true }],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "checklistItems",
  });

  useEffect(() => {
    let active = true;
    setUsersLoading(true);
    setUsersError(undefined);
    void listUserOptions()
      .then((result) => {
        if (active) setUsers(result);
      })
      .catch((error: unknown) => {
        if (active) {
          setUsersError(error instanceof Error ? error.message : "Não foi possível carregar os usuários.");
        }
      })
      .finally(() => {
        if (active) setUsersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [usersReloadKey]);

  async function submit(values: CreateOrderValues) {
    await onCreate({
      title: values.title,
      description: values.description,
      priority: values.priority,
      clientId: values.clientId,
      technicianId: values.technicianId || undefined,
      dueAt: values.dueAt ? new Date(values.dueAt).toISOString() : undefined,
      checklistItems: values.checklistItems
        .filter((item) => item.description.trim())
        .map((item, index) => ({
          description: item.description.trim(),
          required: item.required,
          sortOrder: index,
        })),
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !form.formState.isSubmitting) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-os-title"
        className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-7 sm:py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-primary-light">Ordens de serviço</p>
            <h2 id="create-os-title" className="mt-1 text-xl font-semibold text-slate-900">Nova ordem de serviço</h2>
            <p className="mt-1 text-xs text-slate-500">Registre a atividade, prioridade e etapas de execução.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="size-5" />
          </button>
        </header>

        <form onSubmit={form.handleSubmit(submit)} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
            <div>
              <label htmlFor="os-title" className="mb-1.5 block text-xs font-semibold text-slate-700">Título da atividade</label>
              <input id="os-title" autoFocus placeholder="Ex.: Inspeção preventiva da bomba principal" {...form.register("title")} className={inputClass} />
              {form.formState.errors.title ? <p role="alert" className="mt-1 text-xs text-rose-600">{form.formState.errors.title.message}</p> : null}
            </div>

            <div>
              <label htmlFor="os-description" className="mb-1.5 block text-xs font-semibold text-slate-700">Descrição do serviço</label>
              <textarea id="os-description" rows={3} placeholder="Inclua o contexto e o resultado esperado." {...form.register("description")} className={inputClass + " resize-y"} />
              {form.formState.errors.description ? <p role="alert" className="mt-1 text-xs text-rose-600">{form.formState.errors.description.message}</p> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="os-priority" className="mb-1.5 block text-xs font-semibold text-slate-700">Prioridade</label>
                <select id="os-priority" {...form.register("priority")} className={inputClass}>
                  {PRIORITIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="os-due" className="mb-1.5 block text-xs font-semibold text-slate-700">Previsão de conclusão</label>
                <input id="os-due" type="datetime-local" {...form.register("dueAt")} className={inputClass} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-800">Vínculos da ordem</h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">Selecione as contas responsáveis pela ordem.</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] text-slate-500">Cadastro atual</span>
              </div>
              {usersError ? (
                <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-800">
                  <span>{usersError}</span>
                  <button type="button" onClick={() => setUsersReloadKey((key) => key + 1)} className="inline-flex items-center gap-1 font-semibold underline underline-offset-2">
                    <RefreshCw className="size-3" /> Tentar novamente
                  </button>
                </div>
              ) : null}
              {!usersLoading && !usersError && users.length === 0 ? (
                <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                  Nenhum usuário cadastrado para vincular à ordem.
                </p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="os-client" className="mb-1.5 block text-[11px] font-medium text-slate-600">Cliente *</label>
                  <select id="os-client" disabled={usersLoading || Boolean(usersError) || users.length === 0} {...form.register("clientId")} className={inputClass + " disabled:cursor-not-allowed disabled:bg-slate-100"}>
                    <option value="">{usersLoading ? "Carregando usuários…" : "Selecione um cliente"}</option>
                    {users.map((user) => <option key={user.id} value={user.id}>{user.name} — {user.email}</option>)}
                  </select>
                  {form.formState.errors.clientId ? <p role="alert" className="mt-1 text-[11px] text-rose-600">{form.formState.errors.clientId.message}</p> : null}
                </div>
                <div>
                  <label htmlFor="os-technician" className="mb-1.5 block text-[11px] font-medium text-slate-600">Técnico responsável</label>
                  <select id="os-technician" disabled={usersLoading || Boolean(usersError) || users.length === 0} {...form.register("technicianId")} className={inputClass + " disabled:cursor-not-allowed disabled:bg-slate-100"}>
                    <option value="">Sem técnico (opcional)</option>
                    {users.map((user) => <option key={user.id} value={user.id}>{user.name} — {user.email}</option>)}
                  </select>
                  {form.formState.errors.technicianId ? <p role="alert" className="mt-1 text-[11px] text-rose-600">{form.formState.errors.technicianId.message}</p> : null}
                </div>
              </div>
            </div>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Checklist de execução</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Etapas obrigatórias impedem a conclusão da OS enquanto estiverem pendentes.</p>
                </div>
                <button type="button" onClick={() => append({ description: "", required: true })} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-brand-primary/20 bg-teal-50 px-3 text-xs font-semibold text-brand-primary hover:bg-teal-100">
                  <Plus className="size-3.5" /> Adicionar
                </button>
              </div>
              {fields.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">Nenhuma etapa adicionada.</div>
              ) : (
                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-2 rounded-lg border border-slate-200 p-3">
                      <div className="min-w-0 flex-1">
                        <input aria-label={`Etapa ${index + 1}`} placeholder={`Descreva a etapa ${index + 1}`} {...form.register(`checklistItems.${index}.description`)} className={inputClass + " min-h-10"} />
                        <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-[11px] text-slate-600">
                          <input type="checkbox" {...form.register(`checklistItems.${index}.required`)} className="size-3.5 accent-brand-primary" />
                          Etapa obrigatória
                        </label>
                      </div>
                      <button type="button" onClick={() => remove(index)} aria-label={`Remover etapa ${index + 1}`} className="mt-1 rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            <button type="button" disabled={form.formState.isSubmitting} onClick={onClose} className="min-h-11 rounded-lg border border-slate-200 px-5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={form.formState.isSubmitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-primary px-5 text-xs font-semibold text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-60">
              {form.formState.isSubmitting ? <span className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white" /> : <Plus className="size-4" />}
              Criar ordem
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
