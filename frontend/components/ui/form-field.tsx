"use client";

import {
  forwardRef,
  type ComponentType,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import type { LucideProps } from "lucide-react";

export function Label({
  htmlFor,
  children,
  required = false,
}: {
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-sm font-medium text-slate-700"
    >
      {children}
      {required ? <span className="ml-1 text-brand-accent" aria-hidden="true">*</span> : null}
    </label>
  );
}

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: ComponentType<LucideProps>;
  trailing?: ReactNode;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  function FormField(
    { label, error, icon: Icon, trailing, className = "", id, ...inputProps },
    ref,
  ) {
    const fieldId = id ?? inputProps.name ?? "form-field";
    const errorId = fieldId + "-error";

    return (
      <div className="w-full">
        <Label htmlFor={fieldId} required={inputProps.required}>
          {label}
        </Label>
        <div className="relative">
          {Icon ? (
            <Icon
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-slate-500"
              strokeWidth={1.8}
            />
          ) : null}
          <input
            {...inputProps}
            ref={ref}
            id={fieldId}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : inputProps["aria-describedby"]}
            className={
              "min-h-12 w-full rounded-lg border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 disabled:bg-slate-50 " +
              (Icon ? "pl-11 " : "") +
              (trailing ? "pr-12 " : "") +
              (error
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10 "
                : "border-slate-300 ") +
              className
            }
          />
          {trailing ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {trailing}
            </div>
          ) : null}
        </div>
        <FormError id={errorId} message={error} />
      </div>
    );
  },
);

export function FormError({
  id,
  message,
}: {
  id?: string;
  message?: string;
}) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs font-medium text-rose-700">
      {message}
    </p>
  );
}
