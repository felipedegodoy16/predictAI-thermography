"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Building2, Plus } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading";
import { ApiError, createAccount, listAccounts, type Account } from "@/lib/api";

export function AccountsManagementPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountsError, setAccountsError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function refresh() {
    setLoading(true);
    setAccountsError("");
    try { setAccounts(await listAccounts()); }
    catch (reason) { setAccountsError(reason instanceof Error ? reason.message : "Não foi possível carregar as contas."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    try {
      const account = await createAccount({
        name: String(form.get("name") ?? ""),
        admin_name: String(form.get("admin_name") ?? ""),
        admin_email: String(form.get("admin_email") ?? ""),
        admin_password: String(form.get("admin_password") ?? ""),
      });
      setSuccess(`Conta ${account.name} e seu administrador foram cadastrados.`);
      setError("");
      formElement.reset();
      await refresh();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Não foi possível cadastrar a conta.");
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">Administração PredictAI</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Contas clientes</h1>
        <p className="mt-1 text-sm text-slate-500">Cada conta mantém seus próprios usuários, equipamentos, imagens e ordens de serviço.</p>
      </header>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Contas cadastradas</h2>
          {accountsError ? <p role="alert" className="mb-3 text-sm text-rose-700">{accountsError}</p> : null}
          {loading ? <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><LoadingSpinner /> Carregando...</p> : accounts.length ? (
            <div className="divide-y divide-slate-100">
              {accounts.map((account) => <article key={account.id} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
                <span className="flex size-10 items-center justify-center rounded-xl bg-teal-50 text-brand-primary"><Building2 className="size-5" /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{account.name}</p><p className="text-xs text-slate-500">{account.slug}</p></div>
                <div className="text-right text-xs text-slate-500"><p>{account.user_count} usuários</p><p>{account.equipment_count} equipamentos</p></div>
              </article>)}
            </div>
          ) : <p className="text-sm text-slate-500">Nenhuma conta encontrada.</p>}
        </section>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2"><Plus className="size-4 text-brand-primary" /><h2 className="text-sm font-semibold text-slate-800">Criar conta e administrador</h2></div>
          <label className="block text-xs font-medium text-slate-600">Empresa<input name="name" required minLength={2} maxLength={160} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
          <label className="block text-xs font-medium text-slate-600">Nome do administrador<input name="admin_name" required minLength={2} maxLength={120} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
          <label className="block text-xs font-medium text-slate-600">Email do administrador<input name="admin_email" required type="email" className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
          <label className="block text-xs font-medium text-slate-600">Senha inicial<input name="admin_password" required minLength={12} maxLength={128} type="password" className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /><span className="mt-1 block text-[11px] font-normal text-slate-400">Mínimo de 12 caracteres.</span></label>
          {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : null}
          {success ? <p role="status" className="text-sm text-emerald-700">{success}</p> : null}
          <button disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">{saving ? <><LoadingSpinner /> Salvando...</> : "Criar conta"}</button>
        </form>
      </div>
    </div>
  );
}
