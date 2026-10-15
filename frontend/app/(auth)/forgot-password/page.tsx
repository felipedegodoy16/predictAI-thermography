import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Recuperar senha",
  description: "Solicite um link para redefinir sua senha.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell variant="forgot">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
