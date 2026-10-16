"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Ellipsis,
  Info,
  Pencil,
  Search,
  ShieldCheck,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  UserFormDrawer,
  type ManagedUser,
  type UserRole,
} from "@/components/dashboard/users/user-form-drawer";

const demoUsers: ManagedUser[] = [
  { id: "u-1", name: "Felipe Godoy", email: "felipe.godoy@predictai.demo", job: "Administrador", role: "ADMIN", active: true, lastAccess: "16/10/2026 · 14:32", modules: ["ordens", "equipamentos", "relatorios", "usuarios"] },
  { id: "u-2", name: "Ana Souza", email: "ana.souza@predictai.demo", job: "Técnica de manutenção", role: "TECNICO", active: true, lastAccess: "16/10/2026 · 10:15", modules: ["ordens", "equipamentos"] },
  { id: "u-3", name: "Carlos Mendes", email: "carlos.mendes@predictai.demo", job: "Gestor de operações", role: "GESTOR", active: true, lastAccess: "15/10/2026 · 16:42", modules: ["ordens", "equipamentos", "relatorios"] },
  { id: "u-4", name: "Mariana Costa", email: "mariana.costa@predictai.demo", job: "Analista de manutenção", role: "GESTOR", active: true, lastAccess: "15/10/2026 · 11:27", modules: ["ordens", "relatorios"] },
  { id: "u-5", name: "Rafael Costa", email: "rafael.costa@predictai.demo", job: "Técnico eletromecânico", role: "TECNICO", active: true, lastAccess: "14/10/2026 · 15:03", modules: ["ordens", "equipamentos"] },
  { id: "u-6", name: "Juliana Lima", email: "juliana.lima@predictai.demo", job: "Suporte técnico", role: "GESTOR", active: true, lastAccess: "14/10/2026 · 14:18", modules: ["ordens", "equipamentos", "relatorios"] },
  { id: "u-7", name: "Lucas Pereira", email: "lucas.pereira@predictai.demo", job: "Planejador de manutenção", role: "GESTOR", active: false, lastAccess: "12/10/2026 · 09:45", modules: ["ordens", "relatorios"] },
  { id: "u-8", name: "Fernanda Alves", email: "fernanda.alves@predictai.demo", job: "Técnica de manutenção", role: "TECNICO", active: true, lastAccess: "12/10/2026 · 08:21", modules: ["ordens", "equipamentos"] },
];

const roleDetails: Record<UserRole, { label: string; className: string }> = {
  ADMIN: { label: "Administrador", className: "bg-brand-primary text-white" },
  GESTOR: { label: "Gestor", className: "bg-slate-700 text-white" },
  TECNICO: { label: "Técnico", className: "bg-slate-100 text-slate-700" },
};

export default function UsersPage() {
  const [users, setUsers] = useState(demoUsers);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [menuUserId, setMenuUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<ManagedUser | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<ManagedUser | null>(null);

  const visibleUsers = useMemo(() => users.filter((user) => {
    const text = `${user.name} ${user.email} ${user.job}`.toLocaleLowerCase("pt-BR");
    return text.includes(query.trim().toLocaleLowerCase("pt-BR")) &&
      (!roleFilter || user.role === roleFilter) &&
      (!statusFilter || String(user.active) === statusFilter);
  }), [users, query, roleFilter, statusFilter]);

  const activeCount = users.filter((user) => user.active).length;
  const managerCount = users.filter((user) => user.role === "GESTOR").length;
  const adminCount = users.filter((user) => user.role === "ADMIN").length;
  const allVisibleSelected = visibleUsers.length > 0 && visibleUsers.every((user) => selectedIds.includes(user.id));

  function openCreate() {
    setEditingUser(undefined);
    setFormOpen(true);
  }

  function openEdit(user: ManagedUser) {
    setEditingUser(user);
    setFormOpen(true);
    setMenuUserId(null);
  }

  function saveUser(value: Omit<ManagedUser, "id" | "lastAccess">) {
    if (editingUser) {
      setUsers((current) => current.map((user) => user.id === editingUser.id ? { ...user, ...value } : user));
    } else {
      setUsers((current) => [{ ...value, id: crypto.randomUUID(), lastAccess: "—" }, ...current]);
    }
    setFormOpen(false);
    toast.info("Alteração aplicada nesta visualização. A API ainda não persiste a gestão de usuários.");
  }

  function requestPasswordReset(user: ManagedUser) {
    setMenuUserId(null);
    toast.info(`O envio de redefinição individual para ${user.email} depende de uma rota de usuários no backend.`);
  }

  function confirmStatusChange() {
    if (!pendingStatusChange) return;
    const user = pendingStatusChange;
    setUsers((current) => current.map((entry) => entry.id === user.id ? { ...entry, active: !entry.active } : entry));
    setPendingStatusChange(null);
    toast.info("Status alterado apenas nesta visualização de protótipo.");
  }

  function toggleSelection(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleAllVisible() {
    setSelectedIds((current) => allVisibleSelected
      ? current.filter((id) => !visibleUsers.some((user) => user.id === id))
      : [...new Set([...current, ...visibleUsers.map((user) => user.id)])],
    );
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-brand-primary-light"><UsersRound className="size-4" /> Administração da plataforma</div>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Usuários e acessos</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">Gerencie as contas e organize as permissões de cada perfil da equipe.</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg bg-brand-primary px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-primary-hover xl:self-auto"><UserPlus className="size-4" /> Novo usuário</button>
      </section>

      <div role="status" className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50/90 px-4 py-3.5 text-sky-900">
        <Info className="mt-0.5 size-4 shrink-0 text-sky-700" />
        <p className="text-xs leading-5"><strong className="font-semibold">Dados de demonstração.</strong> O backend atual ainda não oferece listagem, edição, alteração de status e permissões de usuários. As linhas abaixo são exemplos e as ações ficam somente nesta tela; nenhuma alteração é gravada no servidor.</p>
      </div>

      <section aria-label="Resumo de usuários" className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Total de contas" value={users.length} icon={UsersRound} tone="bg-teal-50 text-brand-primary" />
        <SummaryCard label="Contas ativas" value={activeCount} icon={ShieldCheck} tone="bg-emerald-50 text-emerald-700" />
        <SummaryCard label="Gestores" value={managerCount + adminCount} icon={CircleHelp} tone="bg-slate-100 text-slate-700" detail={`${adminCount} administradores`} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_5px_20px_rgba(15,45,54,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Equipe e permissões</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">Contas de exemplo para visualizar a experiência de administração.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[210px] flex-1 sm:w-[250px] sm:flex-none">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, e-mail ou cargo…" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none placeholder:text-slate-400 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10" />
            </label>
            <button type="button" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-xs font-semibold ${filtersOpen || roleFilter || statusFilter ? "border-brand-primary/30 bg-teal-50 text-brand-primary" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
              <ChevronDown className={`size-3.5 transition-transform ${filtersOpen ? "rotate-180" : ""}`} /> Filtros
            </button>
            <button type="button" onClick={openCreate} className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-primary px-3.5 text-xs font-semibold text-white hover:bg-brand-primary-hover"><UserPlus className="size-3.5" /> Adicionar</button>
          </div>
        </div>

        {filtersOpen ? (
          <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 bg-slate-50/75 px-4 py-3 sm:px-5">
            <label className="min-w-40 flex-1 text-[10px] font-semibold text-slate-500 sm:flex-none">Perfil de acesso
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="mt-1 block h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-normal text-slate-700 outline-none focus:border-brand-primary"><option value="">Todos os perfis</option><option value="ADMIN">Administrador</option><option value="GESTOR">Gestor</option><option value="TECNICO">Técnico</option></select>
            </label>
            <label className="min-w-36 flex-1 text-[10px] font-semibold text-slate-500 sm:flex-none">Status
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="mt-1 block h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-normal text-slate-700 outline-none focus:border-brand-primary"><option value="">Todos os status</option><option value="true">Ativo</option><option value="false">Inativo</option></select>
            </label>
            {roleFilter || statusFilter ? <button type="button" onClick={() => { setRoleFilter(""); setStatusFilter(""); }} className="inline-flex h-9 items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-primary"><X className="size-3.5" /> Limpar filtros</button> : null}
          </div>
        ) : null}

        {selectedIds.length ? (
          <div className="flex items-center justify-between border-b border-teal-100 bg-teal-50 px-4 py-2.5 text-xs sm:px-5">
            <span className="font-medium text-brand-primary">{selectedIds.length} usuário(s) selecionado(s)</span>
            <button type="button" onClick={() => setSelectedIds([])} className="font-semibold text-brand-primary hover:underline">Limpar seleção</button>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead>
              <tr className="bg-[#f4f8fa] text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="w-10 px-4 py-3"><input type="checkbox" aria-label="Selecionar todos os usuários visíveis" checked={allVisibleSelected} onChange={toggleAllVisible} className="size-3.5 accent-brand-primary" /></th>
                <th className="px-3 py-3">Usuário</th><th className="px-3 py-3">Cargo / função</th><th className="px-3 py-3">Perfil de acesso</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Último acesso</th><th className="w-24 px-3 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleUsers.map((user) => <UserRow
                key={user.id}
                user={user}
                selected={selectedIds.includes(user.id)}
                menuOpen={menuUserId === user.id}
                onSelect={() => toggleSelection(user.id)}
                onMenu={() => setMenuUserId((current) => current === user.id ? null : user.id)}
                onEdit={() => openEdit(user)}
                onReset={() => requestPasswordReset(user)}
                onToggle={() => { setMenuUserId(null); setPendingStatusChange(user); }}
              />)}
            </tbody>
          </table>
        </div>

        {visibleUsers.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Search className="mx-auto size-5 text-slate-400" />
            <h3 className="mt-3 text-sm font-semibold text-slate-700">Nenhum usuário encontrado</h3>
            <p className="mt-1 text-xs text-slate-500">Ajuste a busca ou os filtros para ver outros resultados.</p>
          </div>
        ) : null}

        <footer className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span>Mostrando {visibleUsers.length} de {users.length} usuários de demonstração</span>
          <div className="flex items-center gap-1 self-end sm:self-auto">
            <button type="button" aria-label="Página anterior" disabled className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 disabled:opacity-50"><ChevronLeft className="size-4" /></button>
            <span aria-current="page" className="flex size-8 items-center justify-center rounded-lg border border-teal-300 bg-teal-50 text-xs font-semibold text-brand-primary">1</span>
            <button type="button" aria-label="Próxima página" disabled className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 disabled:opacity-50"><ChevronRight className="size-4" /></button>
          </div>
        </footer>
      </section>

      {formOpen ? <UserFormDrawer user={editingUser} onClose={() => setFormOpen(false)} onSave={saveUser} /> : null}
      {pendingStatusChange ? <StatusConfirmDialog user={pendingStatusChange} onClose={() => setPendingStatusChange(null)} onConfirm={confirmStatusChange} /> : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
  detail,
}: {
  label: string;
  value: number;
  icon: typeof UsersRound;
  tone: string;
  detail?: string;
}) {
  return <article className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-[0_2px_8px_rgba(15,45,54,0.025)] sm:px-5"><div><p className="text-[11px] font-medium text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{value}<span className="ml-2 text-[10px] font-normal text-slate-400">{detail}</span></p></div><span className={`flex size-10 items-center justify-center rounded-xl ${tone}`}><Icon className="size-[18px]" /></span></article>;
}

function UserRow({
  user,
  selected,
  menuOpen,
  onSelect,
  onMenu,
  onEdit,
  onReset,
  onToggle,
}: {
  user: ManagedUser;
  selected: boolean;
  menuOpen: boolean;
  onSelect: () => void;
  onMenu: () => void;
  onEdit: () => void;
  onReset: () => void;
  onToggle: () => void;
}) {
  const role = roleDetails[user.role];
  const initials = user.name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <tr className="group hover:bg-slate-50/70">
      <td className="px-4 py-3"><input type="checkbox" aria-label={`Selecionar ${user.name}`} checked={selected} onChange={onSelect} className="size-3.5 accent-brand-primary" /></td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e0f2f1] text-[9px] font-bold text-brand-primary">{initials}</span>
          <span className="min-w-0"><span className="block truncate text-[11px] font-semibold text-slate-800">{user.name}</span><span className="mt-0.5 block truncate text-[10px] text-slate-500">{user.email}</span></span>
        </div>
      </td>
      <td className="px-3 py-3 text-[10px] text-slate-600">{user.job}</td>
      <td className="px-3 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-semibold ${role.className}`}>{role.label}</span></td>
      <td className="px-3 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold ${user.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}><span className={`size-1.5 rounded-full ${user.active ? "bg-emerald-500" : "bg-slate-400"}`} />{user.active ? "Ativo" : "Inativo"}</span></td>
      <td className="px-3 py-3 text-[10px] text-slate-500">{user.lastAccess}</td>
      <td className="relative px-3 py-3 text-right">
        <button type="button" onClick={onEdit} aria-label={`Editar ${user.name}`} title="Editar usuário" className="rounded-md p-1.5 text-brand-primary hover:bg-teal-50"><Pencil className="size-3.5" /></button>
        <button type="button" onClick={onMenu} aria-label={`Mais ações para ${user.name}`} aria-expanded={menuOpen} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Ellipsis className="size-4" /></button>
        {menuOpen ? <div className="absolute right-3 top-10 z-30 w-48 rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-xl">
          <button type="button" onClick={onEdit} className="block w-full rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Editar dados e módulos</button>
          <button type="button" onClick={onReset} className="block w-full rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Solicitar redefinição</button>
          <button type="button" onClick={onToggle} className={`block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-slate-50 ${user.active ? "text-rose-700" : "text-emerald-700"}`}>{user.active ? "Desativar acesso" : "Ativar acesso"}</button>
        </div> : null}
      </td>
    </tr>
  );
}

function StatusConfirmDialog({
  user,
  onClose,
  onConfirm,
}: {
  user: ManagedUser;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const nextActive = !user.active;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="status-confirm-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className={`flex size-10 items-center justify-center rounded-xl ${nextActive ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}><AlertTriangle className="size-5" /></div>
        <h2 id="status-confirm-title" className="mt-4 text-base font-semibold text-slate-900">{nextActive ? "Ativar usuário?" : "Desativar acesso?"}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{nextActive ? "A conta de" : "A conta de"} <strong className="font-semibold text-slate-800">{user.name}</strong> será {nextActive ? "marcada como ativa" : "marcada como inativa"} nesta visualização.</p>
        <p className="mt-2 text-xs leading-5 text-slate-500">Essa alteração é demonstrativa e não altera as permissões reais no servidor.</p>
        <footer className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="min-h-10 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button type="button" onClick={onConfirm} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold text-white ${nextActive ? "bg-emerald-700 hover:bg-emerald-800" : "bg-rose-700 hover:bg-rose-800"}`}><Check className="size-3.5" />{nextActive ? "Ativar conta" : "Desativar usuário"}</button>
        </footer>
      </section>
    </div>
  );
}
