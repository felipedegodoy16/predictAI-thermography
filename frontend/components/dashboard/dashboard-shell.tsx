"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  Bell,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  UsersRound,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/auth/brand-logo";
import { clearAuthSession, getAuthSession } from "@/lib/auth-session";

const navigation = [
  { label: "Início", href: null, icon: LayoutDashboard },
  { label: "Equipamentos", href: null, icon: Boxes },
  { label: "Ordens de serviço", href: "/kanban", icon: ClipboardList },
  { label: "Usuários", href: "/usuarios", icon: UsersRound },
  { label: "Relatórios", href: null, icon: Activity },
  { label: "Configurações", href: null, icon: Settings2 },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const session = getAuthSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setEmail(session.email);
    setReady(true);
  }, [router]);

  useEffect(() => setMobileOpen(false), [pathname]);

  function signOut() {
    clearAuthSession();
    router.replace("/login");
  }

  const initials = email
    .split("@")[0]
    .split(/[._-]/)
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
        <nav aria-label="Navegação principal" className="mt-9 space-y-1.5">
          {navigation.map(({ label, href, icon: Icon }) => {
            const active = href !== null && pathname === href;
            const content = (
              <>
                <Icon aria-hidden="true" className="size-[18px] shrink-0" />
                <span className="flex-1">{label}</span>
                {href === null ? (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] text-teal-100">
                    Em breve
                  </span>
                ) : null}
              </>
            );
            const className =
              "flex min-h-11 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition " +
              (active
                ? "bg-[#087c7d] text-white shadow-sm"
                : href
                  ? "text-teal-100 hover:bg-white/10 hover:text-white"
                  : "cursor-not-allowed text-teal-100/70");

            return href ? (
              <Link key={label} href={href} aria-current={active ? "page" : undefined} className={className}>
                {content}
              </Link>
            ) : (
              <span key={label} aria-disabled="true" className={className}>
                {content}
              </span>
            );
          })}
        </nav>
        <div className="mt-auto rounded-xl border border-teal-300/30 bg-[#075d61]/60 p-4">
          <div className="mb-3 flex size-9 items-center justify-center rounded-lg border border-teal-200/30 bg-teal-200/10 text-teal-200">
            <Activity className="size-[18px]" />
          </div>
          <p className="text-xs font-semibold leading-5 text-white">
            Manutenção em um só lugar
          </p>
          <p className="mt-1 text-[11px] leading-4 text-teal-100/75">
            Corretiva, preventiva e preditiva para sua operação.
          </p>
          <div className="mt-4 flex gap-1.5" aria-hidden="true">
            <span className="h-1 w-8 rounded-full bg-teal-300" />
            <span className="h-1 w-5 rounded-full bg-teal-300/55" />
            <span className="h-1 w-3 rounded-full bg-teal-300/30" />
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[264px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md sm:px-7">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir navegação"
            >
              <Menu className="size-5" />
            </button>
            <div className="hidden text-xs text-slate-400 sm:block">
              Workspace <span className="mx-2 text-slate-300">/</span>
              <span className="font-medium text-slate-600">
                {pathname === "/usuarios" ? "Usuários" : "Ordens de serviço"}
              </span>
            </div>
            <div className="sm:hidden">
              <BrandLogo compact />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              aria-label="Notificações"
              className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <Bell className="size-[18px]" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-brand-accent" />
            </button>
            <span className="hidden h-8 w-px bg-slate-200 sm:block" />
            <span className="flex size-9 items-center justify-center rounded-full bg-[#087c7d] text-xs font-bold text-white">
              {initials || "PA"}
            </span>
            <div className="hidden min-w-0 sm:block">
              <p className="max-w-52 truncate text-xs font-semibold text-slate-800">{email}</p>
              <p className="text-[10px] text-slate-500">Conta da operação</p>
            </div>
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
        <main className="mx-auto w-full max-w-[1680px] px-4 py-5 sm:px-7 sm:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
