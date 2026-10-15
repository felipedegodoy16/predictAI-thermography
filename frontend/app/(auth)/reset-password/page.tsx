import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Definir nova senha",
  description: "Crie uma nova senha para sua conta ThermoMonitor.",
};

function ResetPasswordFallback() {
  return (
    <div
      role="status"
      className="h-48 animate-pulse rounded-xl bg-slate-100"
      aria-label="Carregando formulário"
    />
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell variant="reset">
      <Suspense fallback={<ResetPasswordFallback />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
