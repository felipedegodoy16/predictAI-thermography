"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthHeading } from "@/components/auth/auth-heading";
import { PasswordStrength } from "@/components/auth/password-strength";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { ApiError, resetPassword } from "@/lib/api";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/lib/validators";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [formError, setFormError] = useState<string>();
  const [success, setSuccess] = useState(false);
  const [invalidLink, setInvalidLink] = useState(!token);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordFormValues) {
    if (!token) {
      setInvalidLink(true);
      return;
    }
    setFormError(undefined);
    try {
      await resetPassword({ token, newPassword: values.newPassword });
      setSuccess(true);
      toast.success("Senha alterada com sucesso.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setInvalidLink(true);
      } else {
        setFormError(
          error instanceof ApiError
            ? error.message
            : "Não foi possível alterar a senha. Tente novamente.",
        );
      }
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <CheckCircle2 aria-hidden="true" className="size-8" />
        </span>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Senha atualizada
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Sua senha foi alterada. Agora você já pode entrar no PredictAI.
        </p>
        <Button
          type="button"
          className="mt-7"
          onClick={() => router.replace("/login")}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Ir para o login
        </Button>
      </div>
    );
  }

  if (invalidLink) {
    return (
      <div className="text-center">
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <KeyRound aria-hidden="true" className="size-7" />
        </span>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Link inválido ou expirado
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Links de redefinição são válidos por 5 minutos e podem ser usados uma
          única vez. Solicite um novo para continuar.
        </p>
        <Link
          href="/forgot-password"
          className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-brand-primary px-5 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          Solicitar novo link
        </Link>
      </div>
    );
  }

  return (
    <>
      <AuthHeading
        title="Definir nova senha"
        description="Crie uma senha forte para proteger sua conta."
      />
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormError message={formError} />
        <FormField
          {...register("newPassword", {
            onChange: (event) => setNewPassword(event.target.value),
          })}
          label="Nova senha"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Pelo menos 12 caracteres"
          icon={LockKeyhole}
          required
          error={errors.newPassword?.message}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="rounded p-1 text-slate-500 hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" className="size-[18px]" />
              ) : (
                <Eye aria-hidden="true" className="size-[18px]" />
              )}
            </button>
          }
        />
        <PasswordStrength value={newPassword} />
        <FormField
          {...register("confirmPassword")}
          label="Confirmar nova senha"
          type={showConfirmation ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Digite a senha novamente"
          icon={LockKeyhole}
          required
          error={errors.confirmPassword?.message}
          trailing={
            <button
              type="button"
              onClick={() => setShowConfirmation((visible) => !visible)}
              className="rounded p-1 text-slate-500 hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
              aria-label={
                showConfirmation
                  ? "Ocultar confirmação da senha"
                  : "Mostrar confirmação da senha"
              }
              aria-pressed={showConfirmation}
            >
              {showConfirmation ? (
                <EyeOff aria-hidden="true" className="size-[18px]" />
              ) : (
                <Eye aria-hidden="true" className="size-[18px]" />
              )}
            </button>
          }
        />
        <Button type="submit" loading={isSubmitting}>
          <KeyRound aria-hidden="true" className="size-4" />
          Salvar nova senha
        </Button>
      </form>
      <Link
        href="/login"
        className="mt-6 inline-flex w-full items-center justify-center gap-2 text-xs font-medium text-slate-600 hover:text-brand-primary"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Voltar para o login
      </Link>
    </>
  );
}
