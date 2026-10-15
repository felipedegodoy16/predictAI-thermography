import { z } from "zod";

const email = z
  .email("Informe um e-mail válido.")
  .max(320, "O e-mail deve ter até 320 caracteres.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Informe sua senha.").max(128),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(12, "A senha deve ter pelo menos 12 caracteres.")
      .max(128, "A senha deve ter no máximo 128 caracteres.")
      .regex(/[0-9]/, "Inclua pelo menos um número.")
      .regex(/[^A-Za-z0-9]/, "Inclua pelo menos um símbolo."),
    confirmPassword: z.string().min(1, "Confirme sua nova senha."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
