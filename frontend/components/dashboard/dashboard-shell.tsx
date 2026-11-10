"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  Building2,
  ChartNoAxesCombined,
  ClipboardList,
  LogOut,
  Menu,
  Images,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/auth/brand-logo";
import { getMyUser, listAccounts, type Account, type User } from "@/lib/api";
import { clearAuthSession, getAuthSession } from "@/lib/auth-session";
import { getAccountScope, setAccountScope } from "@/lib/account-scope";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: ChartNoAxesCombined },
  { label: "Ordens de serviço", href: "/kanban", icon: ClipboardList },
  { label: "Equipamentos", href: "/equipamentos", icon: Wrench },
  { label: "Imagens termográficas", href: "/imagens-termograficas", icon: Images, testOnly: true },
  { label: "Usuários", href: "/usuarios", icon: UsersRound },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState(getAccountScope);

  useEffect(() => {
    const session = getAuthSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    void getMyUser()
      .then(async (profile) => {
        setUser(profile);
        setName(profile.name);
        if (profile.role === "master_admin") setAccounts(await listAccounts());
      })
      .catch(() => setName("Minha conta"));
    setReady(true);
  }, [router]);

  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    function refreshProfileName() {
      void getMyUser()
        .then((user) => setName(user.name))
        .catch(() => setName("Minha conta"));
    }
    window.addEventListener("auth-profile-updated", refreshProfileName);
    return () => window.removeEventListener("auth-profile-updated", refreshProfileName);
  }, []);

  function signOut() {
    clearAuthSession();
    setAccountScope(null);
    router.replace("/login");
  }

  function changeAccount(accountId: string) {
    const value = accountId || null;
    setAccountScope(value);
    setSelectedAccount(value);
    window.location.reload();
  }

  const visibleNavigation = user?.role === "master_admin"
    ? [...navigation, { label: "Contas", href: "/contas", icon: Building2 }]
    : navigation;

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface">
        <div role="status" className="flex items-center gap-3 text-sm text-slate-500">
          <span className="size-4 animate-spin rounded-full border-2 border-brand-primary/20 border-t-brand-primary" />
          Carregando sua sessão…
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f7f8] text-slate-900">
      {mobileOpen ? (
        <button
          aria-label="Fechar navegação"
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <aside
        className={
          "fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col bg-[#063f46] px-4 py-5 text-white shadow-xl transition-transform duration-200 lg:translate-x-0 " +
          (mobileOpen ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="flex items-center justify-between px-2">
          <BrandLogo light compact />
          <button
            className="rounded-lg p-2 text-teal-100 hover:bg-white/10 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav aria-label="Navegação principal" className="mt-6 space-y-1.5">
          {visibleNavigation.map(({ label, href, icon: Icon, testOnly }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            const content = (
              <>
                <Icon aria-hidden="true" className="size-[18px] shrink-0" />
                <span className="flex-1">{label}</span>
                {testOnly ? <span className="rounded-full bg-amber-200/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-200">Teste</span> : null}
              </>
            );
            const className =
              "flex min-h-11 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition " +
              (active
                ? "bg-[#087c7d] text-white shadow-sm"
                : "text-teal-100 hover:bg-white/10 hover:text-white");

            return (
              <Link key={label} href={href} aria-current={active ? "page" : undefined} className={className}>
                {content}
              </Link>
            );
          })}
        </nav>
        <section aria-label="Sobre a gestão de manutenção" className="mt-auto rounded-xl border border-teal-300/25 bg-[#075d61]/55 p-3.5">
          <span className="mb-2.5 flex size-8 items-center justify-center rounded-lg border border-teal-200/25 bg-teal-200/10 text-teal-200">
            <Activity aria-hidden="true" className="size-4" />
          </span>
          <h2 className="text-xs font-semibold text-white">Manutenção em um só lugar</h2>
          <p className="mt-1 text-[11px] leading-4 text-teal-100/80">
            Organize atividades corretivas e preditivas da operação.
          </p>
        </section>
      </aside>

      <div className="min-h-screen lg:pl-[264px]">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/90 px-3 backdrop-blur-md sm:h-16 sm:px-7">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir navegação"
            >
              <Menu className="size-5" />
            </button>
            <div className="lg:hidden">
              <BrandLogo compact />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {user?.role === "master_admin" ? (
              <label className="hidden items-center gap-2 text-xs text-slate-500 md:flex">
                <span>Conta</span>
                <select aria-label="Selecionar conta" value={selectedAccount ?? ""} onChange={(event) => changeAccount(event.target.value)} className="max-w-52 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700">
                  <option value="">Todas as contas</option>
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </label>
            ) : user?.account_name ? <span className="hidden max-w-48 truncate rounded-lg bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800 sm:block">{user.account_name}</span> : null}
            <Link
              href="/perfil"
              aria-label={`Abrir o perfil de ${name || "usuário"}`}
              title="Meu perfil"
              className="group flex items-center gap-2 rounded-lg px-1 py-1 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#087c7d] text-xs font-bold text-white">
                {initials || "PA"}
              </span>
              <span className="hidden min-w-0 text-left sm:block">
                <span className="block max-w-52 truncate text-xs font-semibold text-slate-800 group-hover:text-brand-primary">
                  {name || "Minha conta"}
                </span>
                <span className="block text-[10px] text-slate-500">Meu perfil</span>
              </span>
            </Link>
            <button
              type="button"
              aria-label="Sair da conta"
              title="Sair"
              onClick={signOut}
              className="ml-1 rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut className="size-[17px]" />
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1680px] px-3 py-3 sm:px-7 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
