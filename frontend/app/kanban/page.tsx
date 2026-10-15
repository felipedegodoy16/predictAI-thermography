"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, LogOut } from "lucide-react";
import { BrandLogo } from "@/components/auth/brand-logo";
import { Button } from "@/components/ui/button";
import {
  clearAuthSession,
  getAuthSession,
  type AuthSession,
} from "@/lib/auth-session";

export default function KanbanPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const currentSession = getAuthSession();
    if (!currentSession) {
      router.replace("/login");
      return;
    }
    setSession(currentSession);
    setChecking(false);
  }, [router]);

  function signOut() {
    clearAuthSession();
    router.replace("/login");
  }

  if (checking || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface">
        <p role="status" className="text-sm text-slate-500">
          Carregando sua sessão…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-7">
          <BrandLogo compact />
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-600 sm:block">
              {session.email}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
            >
              <LogOut aria-hidden="true" className="size-4" />
              Sair
            </button>
          </div>
        </header>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
          <span className="mb-5 flex size-12 items-center justify-center rounded-xl bg-teal-50 text-brand-primary">
            <Activity aria-hidden="true" className="size-6" />
          </span>
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-primary-light">
            Acesso confirmado
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Bem-vindo ao ThermoMonitor
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            A autenticação está conectada à API. O painel de ordens de serviço
            será desenvolvido nesta área.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-8 w-auto"
            onClick={signOut}
          >
            <LogOut aria-hidden="true" className="size-4" />
            Sair da conta
          </Button>
        </section>
      </div>
    </main>
  );
}
