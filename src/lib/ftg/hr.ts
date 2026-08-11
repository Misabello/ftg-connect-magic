/** Catálogos compartidos del legajo de empleado (cliente y servidor). */
export const EMPLOYMENT_STATUSES = [
  "activo",
  "licencia",
  "vacaciones",
  "suspendido",
  "baja_programada",
  "desvinculado",
] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  activo: "Activo",
  licencia: "Licencia",
  vacaciones: "Vacaciones",
  suspendido: "Suspendido",
  baja_programada: "Baja programada",
  desvinculado: "Desvinculado",
};

export const USER_STATUS_LABELS: Record<string, string> = {
  invitado: "Invitado",
  activo: "Activo",
  suspendido: "Suspendido",
  baja_programada: "Baja programada",
  inactivo: "Inactivo",
};

export const CONTRACT_TYPES = [
  "Relación de dependencia",
  "Plazo fijo",
  "Eventual / temporada",
  "Pasantía",
  "Monotributista",
  "Prestador de servicios",
];

/** Antigüedad expresada en años y meses. */
export function seniorityFrom(hireDate: string | null | undefined, until?: string | null): string {
  if (!hireDate) return "—";
  const start = new Date(hireDate);
  const end = until ? new Date(until) : new Date();
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  if (months < 0) return "—";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} mes${rest === 1 ? "" : "es"}`;
  return `${years} año${years === 1 ? "" : "s"}${rest > 0 ? ` y ${rest} mes${rest === 1 ? "" : "es"}` : ""}`;
}
