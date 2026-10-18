"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, Mail, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthHeading } from "@/components/auth/auth-heading";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { ApiError, requestPasswordReset } from "@/lib/api";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/lib/validators";

export function ForgotPasswordForm() {
  const [submittedEmail, setSubmittedEmail] = useState<string>();
  const [cooldown, setCooldown] = useState(0);
  const [formError, setFormError] = useState<string>();
  const [isResending, setIsResending] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function submitEmail(email: string) {
    setFormError(undefined);
    try {
      await requestPasswordReset({ email });
      setSubmittedEmail(email);
      setCooldown(60);
      toast.success("Solicitação enviada.");
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível enviar a solicitação. Tente novamente.",
      );
    }
  }

  async function onSubmit(values: ForgotPasswordFormValues) {
    await submitEmail(values.email);
  }

  async function resendEmail() {
    if (!submittedEmail || cooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      await submitEmail(submittedEmail);
    } finally {
      setIsResending(false);
    }
  }

  if (submittedEmail) {
    return (
      <div className="text-center">
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <CheckCircle2 aria-hidden="true" className="size-8" strokeWidth={1.8} />
        </span>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Confira seu e-mail
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Se o e-mail estiver cadastrado em nossa base, enviamos um link de
          redefinição válido por 5 minutos.
        </p>
        <p className="mt-2 break-all text-sm font-semibold text-brand-primary">
          {submittedEmail}
        </p>
        <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-left text-xs leading-5 text-slate-500">
          Verifique também sua caixa de spam. O envio pode levar alguns minutos.
        </p>
        <div className="mt-6 space-y-3">
          <Button
            type="button"
            onClick={resendEmail}
            loading={isResending}
            disabled={cooldown > 0}
          >
            <Send aria-hidden="true" className="size-4" />
            {cooldown > 0 ? "Reenviar em " + cooldown + "s" : "Reenviar e-mail"}
          </Button>
          <FormError message={formError} />
          <button
            type="button"
            onClick={() => {
              setSubmittedEmail(undefined);
              setCooldown(0);
              setFormError(undefined);
              reset({ email: "" });
            }}
            className="text-xs font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-brand-primary"
          >
            Usar outro e-mail
          </button>
        </div>
        <Link
          href="/login"
          className="mt-7 inline-flex items-center gap-2 text-xs font-semibold text-brand-primary hover:text-brand-primary-hover"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <>
      <AuthHeading
        title="Recuperar senha"
        description="Digite seu e-mail cadastrado no sistema."
      />
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormError message={formError} />
        <FormField
          {...register("email")}
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="voce@empresa.com"
          icon={Mail}
          required
          error={errors.email?.message}
        />
        <Button type="submit" loading={isSubmitting}>
          <Send aria-hidden="true" className="size-4" />
          Enviar link de recuperação
        </Button>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        <span>ou</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <Link
        href="/login"
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-xs font-semibold text-brand-primary transition hover:border-brand-primary/50 hover:bg-teal-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Voltar para o login
      </Link>
    </>
  );
}
