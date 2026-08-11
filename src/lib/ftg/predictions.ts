/** Dominio de "Predicciones con IA" — compartido por cliente y servidor. */

export type TargetFamily = "ventas" | "costos" | "productos";
export type Granularity = "diario" | "semanal" | "mensual";

export const TARGET_FAMILY_LABELS: Record<TargetFamily, { es: string; pt: string; hint: string }> = {
  ventas: { es: "Ventas", pt: "Vendas", hint: "Cuánto se espera vender en el período elegido." },
  costos: { es: "Costos", pt: "Custos", hint: "Qué costos se esperan según el histórico registrado." },
  productos: {
    es: "Productos a vender",
    pt: "Produtos a vender",
    hint: "Qué productos conviene tener disponibles y en qué cantidad.",
  },
};

export const HORIZON_PRESETS = [
  { key: "7d", label: "Próximos 7 días", days: 7 },
  { key: "15d", label: "Próximos 15 días", days: 15 },
  { key: "30d", label: "Próximos 30 días", days: 30 },
  { key: "3m", label: "Próximos 3 meses", days: 90 },
  { key: "6m", label: "Próximos 6 meses", days: 180 },
  { key: "custom", label: "Período personalizado", days: 0 },
] as const;

export type HorizonKey = (typeof HORIZON_PRESETS)[number]["key"];

export const GRANULARITY_LABELS: Record<Granularity, string> = {
  diario: "Diario",
  semanal: "Semanal",
  mensual: "Mensual",
};

export const JOB_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  en_cola: "En cola",
  preparando_datos: "Preparando datos",
  entrenando: "Analizando histórico",
  evaluando: "Validando resultados",
  generando_informe: "Generando informe",
  completado: "Completado",
  datos_insuficientes: "Sin datos suficientes",
  error: "Error",
  cancelado: "Cancelado",
};

export const INSUFFICIENT_DATA_MESSAGE =
  "No hay suficiente información histórica para generar una predicción confiable.";

export const FORECAST_DISCLAIMER =
  "Las predicciones son estimaciones basadas en información histórica y no garantizan resultados futuros.";

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Ventana futura a predecir a partir del preset elegido. */
export function horizonRange(preset: HorizonKey, from = new Date()): { from: string; to: string } | null {
  const found = HORIZON_PRESETS.find((p) => p.key === preset);
  if (!found || found.days === 0) return null;
  return { from: isoDate(addDays(from, 1)), to: isoDate(addDays(from, found.days)) };
}

/**
 * Ventana histórica a considerar: al menos el mínimo del objetivo y
 * como mínimo cuatro veces el horizonte solicitado, para poder hacer backtesting.
 */
export function historyRange(minHistoryDays: number, horizonDays: number, until = new Date()) {
  const span = Math.max(minHistoryDays, horizonDays * 4, 30);
  return { from: isoDate(addDays(until, -span)), to: isoDate(until), span };
}

export function daysBetween(from: string, to: string): number {
  return Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000));
}

export type SufficiencyInput = {
  observations: number;
  distinctDays: number;
  minObservations: number;
  minHistoryDays: number;
};

export type SufficiencyResult = {
  ok: boolean;
  reason: string | null;
  observations: number;
  distinctDays: number;
};

/** Regla única de "¿alcanzan los datos?" — sin datos no se inventa una predicción. */
export function evaluateSufficiency(input: SufficiencyInput): SufficiencyResult {
  const { observations, distinctDays, minObservations, minHistoryDays } = input;
  if (observations === 0) {
    return {
      ok: false,
      reason: `${INSUFFICIENT_DATA_MESSAGE} No se registraron movimientos en el alcance seleccionado.`,
      observations,
      distinctDays,
    };
  }
  if (observations < minObservations) {
    return {
      ok: false,
      reason: `${INSUFFICIENT_DATA_MESSAGE} Se necesitan al menos ${minObservations} registros históricos y hay ${observations}.`,
      observations,
      distinctDays,
    };
  }
  if (distinctDays < Math.min(minHistoryDays, 30)) {
    return {
      ok: false,
      reason: `${INSUFFICIENT_DATA_MESSAGE} Se necesitan al menos ${Math.min(minHistoryDays, 30)} días con actividad y hay ${distinctDays}.`,
      observations,
      distinctDays,
    };
  }
  return { ok: true, reason: null, observations, distinctDays };
}
