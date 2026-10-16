import type { ReactNode } from "react";
import { BrandPanel, type AuthVariant } from "@/components/auth/brand-panel";
import { BrandLogo } from "@/components/auth/brand-logo";

export function AuthShell({
  variant,
  children,
}: {
  variant: AuthVariant;
  children: ReactNode;
}) {
  return (
    <main className="auth-page">
      <div className="auth-frame">
        <BrandPanel variant={variant} />
        <section className="auth-content" aria-label="Acesso ao PredictAI">
          <div className="mb-8 flex justify-center lg:hidden">
            <BrandLogo />
          </div>
          <div className="auth-form-wrap">{children}</div>
          <footer className="mt-10 text-center text-[11px] text-slate-400">
            © {new Date().getFullYear()} PredictAI. Todos os direitos reservados.
          </footer>
        </section>
      </div>
    </main>
  );
}
