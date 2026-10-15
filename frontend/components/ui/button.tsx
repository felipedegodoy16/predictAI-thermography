import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

type ButtonVariant = "primary" | "outline" | "text";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-primary text-white shadow-sm hover:bg-brand-primary-hover focus-visible:outline-brand-primary",
  outline:
    "border border-slate-300 bg-white text-brand-primary hover:border-brand-primary/50 hover:bg-teal-50/50 focus-visible:outline-brand-primary",
  text:
    "bg-transparent text-brand-primary hover:bg-teal-50 focus-visible:outline-brand-primary",
};

export function Button({
  children,
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={
        "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 " +
        variants[variant] +
        " " +
        className
      }
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      ) : null}
      {children}
    </button>
  );
}
