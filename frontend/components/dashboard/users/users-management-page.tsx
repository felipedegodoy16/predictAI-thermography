"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Search, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { UserEditDrawer } from "@/components/dashboard/users/user-edit-drawer";
import {
  ApiError,
  listUsers,
  updateUser,
  type User,
  type UserUpdateInput,
} from "@/lib/api";

const PAGE_SIZE = 50;

export function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingUser, setEditingUser] = useState<User>();

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(undefined);
      void listUsers({
        limit: PAGE_SIZE,
        offset,
        search: query.trim() || undefined,
      })
        .then((result) => {
          if (active) setUsers(result);
        })
        .catch((requestError: unknown) => {
          if (active) {
            setError(
              requestError instanceof ApiError
                ? requestError.message
                : "Não foi possível carregar os usuários.",
            );
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, query ? 250 : 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [offset, query, refreshKey]);

  async function saveUser(changes: UserUpdateInput) {
    if (!editingUser) return;
    await updateUser(editingUser.id, changes);
    toast.success("Usuário atualizado com sucesso.");
    setEditingUser(undefined);
    setRefreshKey((current) => current + 1);
  }

  const firstItem = users.length ? offset + 1 : 0;
  const lastItem = offset + users.length;

  return (
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-brand-primary-light">
            <UsersRound className="size-4" /> Administração da plataforma
          </div>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
            Usuários
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            Consulte as contas cadastradas e atualize nome ou e-mail.
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_5px_20px_rgba(15,45,54,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Contas cadastradas</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              A gestão de permissões será disponibilizada em uma próxima etapa.
            </p>
          </div>
          <label className="relative block w-full sm:w-[280px]">
            <span className="sr-only">Buscar usuário por nome ou e-mail</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setOffset(0);
              }}
              placeholder="Buscar nome ou e-mail"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none placeholder:text-slate-400 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10"
            />
          </label>
        </div>

        {error ? (
          <div role="alert" className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 sm:m-5">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
              className="font-semibold underline underline-offset-2"
            >
              Tentar novamente
            </button>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left">
            <thead>
              <tr className="bg-[#f4f8fa] text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 sm:px-5">Usuário</th>
                <th className="px-3 py-3">Data de cadastro</th>
                <th className="w-24 px-3 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="group hover:bg-slate-50/70">
                  <td className="px-4 py-3 sm:px-5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e0f2f1] text-[10px] font-bold text-brand-primary">
                        {getInitials(user.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-slate-800">
                          {user.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                          {user.email}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[11px] text-slate-500">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setEditingUser(user)}
                      aria-label={`Editar ${user.name}`}
                      title="Editar usuário"
                      className="rounded-md p-2 text-brand-primary transition hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-14 text-center">
                    <Search className="mx-auto size-5 text-slate-400" />
                    <h3 className="mt-3 text-sm font-semibold text-slate-700">
                      Nenhum usuário encontrado
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Tente buscar por outro nome ou endereço de e-mail.
                    </p>
                  </td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-5 py-10 text-center text-xs text-slate-500">
                    <span role="status" className="inline-flex items-center gap-2">
                      <span className="size-3.5 animate-spin rounded-full border-2 border-brand-primary/20 border-t-brand-primary" />
                      Carregando usuários…
                    </span>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span>
            {users.length > 0
              ? `Mostrando ${firstItem}–${lastItem}${users.length === PAGE_SIZE ? "+" : ""}`
              : "Nenhum usuário nesta página"}
          </span>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              aria-label="Página anterior"
              disabled={loading || offset === 0}
              onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
              className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-xs font-medium text-slate-600">
              Página {Math.floor(offset / PAGE_SIZE) + 1}
            </span>
            <button
              type="button"
              aria-label="Próxima página"
              disabled={loading || users.length < PAGE_SIZE}
              onClick={() => setOffset((current) => current + PAGE_SIZE)}
              className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </footer>
      </section>

      {editingUser ? (
        <UserEditDrawer
          user={editingUser}
          onClose={() => setEditingUser(undefined)}
          onSave={saveUser}
        />
      ) : null}
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
