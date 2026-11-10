import { LoaderCircle } from "lucide-react";

export function LoadingSpinner({ className = "size-4" }: { className?: string }) {
  return <LoaderCircle aria-hidden="true" className={`${className} animate-spin`} />;
}

export function LoadingOverlay({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white/85 px-6 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-8 py-7 text-center shadow-xl">
        <LoadingSpinner className="size-9 text-brand-primary" />
        <p className="text-sm font-medium text-slate-700">{message}</p>
      </div>
    </div>
  );
}
