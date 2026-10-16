"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthHeading } from "@/components/auth/auth-heading";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { ApiError, login } from "@/lib/api";
import { saveAuthSession } from "@/lib/auth-session";
import { loginSchema, type LoginFormValues } from "@/lib/validators";

const REMEMBERED_EMAIL_KEY = "predictai.remembered-email";

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [formError, setFormError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    const savedEmail = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (savedEmail) {
      setValue("email", savedEmail);
      setRememberEmail(true);
    }
  }, [setValue]);

  async function onSubmit(values: LoginFormValues) {
    setFormError(undefined);
    try {
      const tokens = await login(values);
      saveAuthSession(tokens, values.email);
      if (rememberEmail) {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, values.email);
      } else {
        window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
      toast.success("Acesso realizado com sucesso.");
      router.replace("/kanban");
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível entrar. Tente novamente.",
      );
    }
  }

  return (
    <>
      <AuthHeading
        title="Bem-vindo de volta!"
        description="Faça login para acessar o sistema."
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

        <FormField
          {...register("password")}
          label="Senha"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Digite sua senha"
          icon={LockKeyhole}
          required
          error={errors.password?.message}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="rounded p-1 text-slate-500 transition hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
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

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <label className="inline-flex cursor-pointer items-center gap-2 text-slate-600">
            <input
              type="checkbox"
              checked={rememberEmail}
              onChange={(event) => setRememberEmail(event.target.checked)}
              className="size-4 rounded border-slate-300 accent-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            />
            Lembrar meu e-mail neste dispositivo
          </label>
          <Link
            href="/forgot-password"
            className="font-semibold text-brand-primary hover:text-brand-primary-hover focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            Esqueceu a senha?
          </Link>
        </div>

        <Button type="submit" loading={isSubmitting} className="mt-2">
          Entrar no sistema
          {!isSubmitting ? (
            <ArrowRight aria-hidden="true" className="size-4" />
          ) : null}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        <span>ou</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <p className="rounded-lg bg-slate-50 px-4 py-3 text-center text-xs leading-5 text-slate-500">
        Entre com seu e-mail corporativo para acessar o monitoramento da sua operação.
      </p>
    </>
  );
}
