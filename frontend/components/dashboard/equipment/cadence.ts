export type CadenceUnit = "minutes" | "hours";

export function getCadenceParts(seconds: number): { value: number; unit: CadenceUnit } {
  return seconds % 3600 === 0
    ? { value: seconds / 3600, unit: "hours" }
    : { value: seconds / 60, unit: "minutes" };
}

export function formatCadence(seconds: number): string {
  const { value, unit } = getCadenceParts(seconds);
  if (unit === "hours") return `${value} ${value === 1 ? "hora" : "horas"}`;
  return `${value} ${value === 1 ? "minuto" : "minutos"}`;
}
