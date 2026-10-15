import { Hexagon, Thermometer } from "lucide-react";

export function BrandLogo({
  light = false,
  compact = false,
}: {
  light?: boolean;
  compact?: boolean;
}) {
  const textColor = light ? "text-white" : "text-brand-primary";

  return (
    <div className={"flex items-center gap-2.5 " + textColor}>
      <span
        className={
          "relative inline-flex shrink-0 items-center justify-center text-brand-accent " +
          (compact ? "size-9" : "size-12")
        }
        aria-hidden="true"
      >
        <Hexagon className="absolute size-full" strokeWidth={1.8} />
        <Thermometer
          className={compact ? "size-[18px]" : "size-6"}
          strokeWidth={1.8}
        />
      </span>
      <span
        className={
          "font-semibold tracking-tight " +
          (compact ? "text-base" : "text-xl")
        }
      >
        Thermo<span className={light ? "font-normal text-teal-100" : "font-normal text-slate-700"}>Monitor</span>
      </span>
    </div>
  );
}
