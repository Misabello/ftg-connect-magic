/**
 * Motor de predicción local (sin servicio externo).
 * Serie temporal -> nivel + tendencia robusta + estacionalidad, con
 * intervalos de confianza y backtesting contra un baseline ingenuo.
 * Funciones puras: no toca la base ni la red.
 */
import { addDays, isoDate, type Granularity } from "@/lib/ftg/predictions";

export type Point = { date: string; value: number };
export type Bucket = { start: string; end: string; value: number };

export type Aggregation = "sum" | "mean";

/** Completa los días sin movimiento con cero para no sesgar la serie. */
export function fillDaily(points: Point[], from: string, to: string): Point[] {
  const map = new Map<string, number>();
  for (const p of points) map.set(p.date, (map.get(p.date) ?? 0) + p.value);
  const out: Point[] = [];
  let cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor.getTime() <= end.getTime()) {
    const key = isoDate(cursor);
    out.push({ date: key, value: map.get(key) ?? 0 });
    cursor = addDays(cursor, 1);
  }
  return out;
}

function bucketStart(date: Date, granularity: Granularity): Date {
  const d = new Date(date);
  if (granularity === "semanal") {
    const dow = (d.getUTCDay() + 6) % 7; // lunes = 0
    return addDays(d, -dow);
  }
  if (granularity === "mensual") return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  return d;
}

function bucketEnd(start: Date, granularity: Granularity): Date {
  if (granularity === "semanal") return addDays(start, 6);
  if (granularity === "mensual") return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  return start;
}

/** Agrupa la serie diaria en los períodos pedidos (sumando o promediando). */
export function bucketize(points: Point[], granularity: Granularity, agg: Aggregation = "sum"): Bucket[] {
  const groups = new Map<string, { values: number[]; start: Date }>();
  for (const p of points) {
    const start = bucketStart(new Date(`${p.date}T00:00:00Z`), granularity);
    const key = isoDate(start);
    const entry = groups.get(key) ?? { values: [], start };
    entry.values.push(p.value);
    groups.set(key, entry);
  }
  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, entry]) => {
      const total = entry.values.reduce((acc, v) => acc + v, 0);
      const nonZero = entry.values.filter((v) => v !== 0);
      const value = agg === "mean" ? (nonZero.length ? total / nonZero.length : 0) : total;
      return { start: key, end: isoDate(bucketEnd(entry.start, granularity)), value };
    });
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Pendiente robusta (Theil-Sen): resiste outliers típicos del retail. */
export function theilSenSlope(values: number[]): number {
  const slopes: number[] = [];
  for (let i = 0; i < values.length; i += 1) {
    for (let j = i + 1; j < values.length; j += 1) {
      slopes.push((values[j]! - values[i]!) / (j - i));
    }
  }
  return slopes.length ? median(slopes) : 0;
}

/** Índices estacionales multiplicativos por posición del ciclo. */
export function seasonalIndices(values: number[], period: number): number[] {
  const base = median(values.filter((v) => v > 0));
  if (!base || values.length < period * 2) return new Array(period).fill(1);
  const idx: number[] = [];
  for (let phase = 0; phase < period; phase += 1) {
    const slice: number[] = [];
    for (let i = phase; i < values.length; i += period) slice.push(values[i]!);
    const ratio = median(slice) / base;
    idx.push(Number.isFinite(ratio) && ratio > 0 ? Math.min(3, Math.max(0.2, ratio)) : 1);
  }
  return idx;
}

export type ForecastPoint = { value: number; lower: number; upper: number };

export type FitResult = {
  forecast: (steps: number) => ForecastPoint[];
  fitted: number[];
  sigma: number;
};

function periodFor(granularity: Granularity): number {
  if (granularity === "diario") return 7;
  if (granularity === "semanal") return 4;
  return 12;
}

/** Ajusta nivel + tendencia + estacionalidad sobre los valores históricos. */
export function fitSeries(values: number[], granularity: Granularity): FitResult {
  const period = periodFor(granularity);
  const indices = seasonalIndices(values, period);
  const deseason = values.map((v, i) => v / (indices[i % period] || 1));
  const window = Math.min(deseason.length, Math.max(period * 3, 8));
  const recent = deseason.slice(-window);
  const slope = theilSenSlope(recent);
  const level = median(recent.slice(-Math.max(3, Math.round(window / 2))));
  const anchor = recent.length - 1;

  const fitted = values.map((_, i) => {
    const offset = i - (values.length - 1 - anchor);
    const trend = level + slope * (offset - anchor);
    return Math.max(0, trend * (indices[i % period] || 1));
  });

  const residuals = values.map((v, i) => v - fitted[i]!);
  const variance = residuals.reduce((acc, r) => acc + r * r, 0) / Math.max(1, residuals.length - 1);
  const sigma = Math.sqrt(Math.max(0, variance));

  return {
    fitted,
    sigma,
    forecast: (steps: number) =>
      Array.from({ length: steps }, (_, h) => {
        const phase = (values.length + h) % period;
        const trend = Math.max(0, level + slope * (h + 1));
        const value = trend * (indices[phase] || 1);
        // La incertidumbre crece con el horizonte.
        const spread = 1.28 * sigma * Math.sqrt(1 + h / Math.max(1, period));
        return {
          value: Math.max(0, value),
          lower: Math.max(0, value - spread),
          upper: value + spread,
        };
      }),
  };
}

export type Metrics = {
  mae: number;
  rmse: number;
  mape: number | null;
  wape: number | null;
  bias: number;
  coverage: number;
  folds: number;
  beatsBaseline: boolean;
};

/** Backtesting simple: se reserva la última ventana y se compara con el baseline. */
export function backtest(values: number[], granularity: Granularity, holdout: number): Metrics | null {
  const period = periodFor(granularity);
  const window = Math.max(1, Math.min(holdout, Math.floor(values.length / 3)));
  const train = values.slice(0, values.length - window);
  const test = values.slice(values.length - window);
  if (train.length < Math.max(6, period) || test.length === 0) return null;

  const fit = fitSeries(train, granularity);
  const preds = fit.forecast(test.length);
  const naive = test.map((_, i) => train[train.length - period + (i % period)] ?? train[train.length - 1] ?? 0);

  const errors = test.map((actual, i) => actual - preds[i]!.value);
  const abs = errors.map((e) => Math.abs(e));
  const mae = abs.reduce((a, b) => a + b, 0) / abs.length;
  const rmse = Math.sqrt(errors.reduce((a, e) => a + e * e, 0) / errors.length);
  const totalActual = test.reduce((a, v) => a + Math.abs(v), 0);
  const wape = totalActual > 0 ? abs.reduce((a, b) => a + b, 0) / totalActual : null;
  const pct = test.map((actual, i) => (actual !== 0 ? Math.abs(errors[i]!) / Math.abs(actual) : null)).filter((v): v is number => v !== null);
  const mape = pct.length ? pct.reduce((a, b) => a + b, 0) / pct.length : null;
  const bias = errors.reduce((a, b) => a + b, 0) / errors.length;
  const covered = test.filter((actual, i) => actual >= preds[i]!.lower && actual <= preds[i]!.upper).length;
  const naiveMae = naive.reduce((acc, v, i) => acc + Math.abs(test[i]! - v), 0) / test.length;

  return {
    mae,
    rmse,
    mape,
    wape,
    bias,
    coverage: covered / test.length,
    folds: 1,
    beatsBaseline: mae <= naiveMae,
  };
}

/** Períodos futuros a estimar entre dos fechas, según granularidad. */
export function futureBuckets(from: string, to: string, granularity: Granularity): { start: string; end: string }[] {
  const out: { start: string; end: string }[] = [];
  let cursor = bucketStart(new Date(`${from}T00:00:00Z`), granularity);
  const limit = new Date(`${to}T00:00:00Z`);
  let guard = 0;
  while (cursor.getTime() <= limit.getTime() && guard < 400) {
    const end = bucketEnd(cursor, granularity);
    out.push({ start: isoDate(cursor), end: isoDate(end) });
    cursor = addDays(end, 1);
    guard += 1;
  }
  return out;
}