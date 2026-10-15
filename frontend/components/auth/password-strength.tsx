const checks = [
  { label: "12 ou mais caracteres", test: (value: string) => value.length >= 12 },
  { label: "Um número", test: (value: string) => /[0-9]/.test(value) },
  { label: "Um símbolo", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;

  const score = checks.filter((check) => check.test(value)).length;
  const strengthLabel = ["Fraca", "Fraca", "Boa", "Forte"][score];
  const barColor =
    score < 2 ? "bg-rose-500" : score === 2 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex items-center gap-2">
        <div
          className="flex h-1.5 flex-1 gap-1"
          role="meter"
          aria-label="Força da senha"
          aria-valuemin={0}
          aria-valuemax={3}
          aria-valuenow={score}
        >
          {checks.map((check, index) => (
            <span
              key={check.label}
              className={
                "h-full flex-1 rounded-full " +
                (index < score ? barColor : "bg-slate-200")
              }
            />
          ))}
        </div>
        <span className="text-[11px] font-medium text-slate-500">
          {strengthLabel}
        </span>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
        {checks.map((check) => {
          const met = check.test(value);
          return (
            <li
              key={check.label}
              className={met ? "text-emerald-700" : ""}
            >
              {met ? "✓ " : "○ "}
              {check.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
