/**
 * Ejecuta un trabajo de predicción con el motor local.
 * Lee el histórico real, estima el horizonte pedido, valida con backtesting
 * y guarda predicciones, métricas, recomendaciones e informe narrativo.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { FORECAST_DISCLAIMER, type Granularity } from "@/lib/ftg/predictions";
import {
  backtest,
  bucketize,
  fillDaily,
  fitSeries,
  futureBuckets,
  type Aggregation,
  type Point,
} from "@/lib/ftg/predictions.engine";

type AnyClient = SupabaseClient<any, any, any>;

const MODEL_ID = "ftg-local-tsf-v1";

type Job = {
  id: string;
  organization_id: string | null;
  location_id: string | null;
  point_of_sale_id: string | null;
  target_key: string;
  granularity: Granularity;
  horizon_from: string;
  horizon_to: string;
  history_from: string;
  history_to: string;
  currency_code: string | null;
  title: string | null;
};

function scopeFilter(query: any, job: Job, locationField = "location_id") {
  let q = query;
  if (job.point_of_sale_id) q = q.eq("point_of_sale_id", job.point_of_sale_id);
  else if (job.location_id) q = q.eq(locationField, job.location_id);
  else if (job.organization_id) q = q.eq("organization_id", job.organization_id);
  return q;
}

type SeriesResult = { points: Point[]; agg: Aggregation; unit: "moneda" | "unidades" };

/** Serie histórica según el objetivo pedido. */
async function loadSeries(supabase: AnyClient, job: Job, family: string): Promise<SeriesResult> {
  const key = job.target_key;

  if (family === "costos") {
    const { data: tickets } = await scopeFilter(
      supabase
        .from("pos_tickets")
        .select("issued_on, amount")
        .in("kind", ["compra", "gasto"])
        .gte("issued_on", job.history_from)
        .lte("issued_on", job.history_to),
      job,
    );
    const points: Point[] = ((tickets ?? []) as any[])
      .filter((r) => r.issued_on)
      .map((r) => ({ date: String(r.issued_on).slice(0, 10), value: Number(r.amount ?? 0) }));

    const { data: docs } = await supabase
      .from("finance_documents")
      .select("issued_on, amount, location_id")
      .eq("kind", "pagar")
      .gte("issued_on", job.history_from)
      .lte("issued_on", job.history_to);
    for (const row of (docs ?? []) as any[]) {
      if (job.location_id && row.location_id && row.location_id !== job.location_id) continue;
      if (!row.issued_on) continue;
      points.push({ date: String(row.issued_on).slice(0, 10), value: Number(row.amount ?? 0) });
    }
    return { points, agg: "sum", unit: "moneda" };
  }

  const { data: sales } = await scopeFilter(
    supabase
      .from("sales")
      .select("id, created_at, total")
      .eq("status", "completada")
      .gte("created_at", `${job.history_from}T00:00:00Z`)
      .lte("created_at", `${job.history_to}T23:59:59Z`),
    job,
  );
  const saleRows = (sales ?? []) as { id: string; created_at: string; total: number }[];

  if (family === "productos") {
    const ids = saleRows.map((s) => s.id);
    const items = await loadSaleItems(supabase, ids);
    const byId = new Map(saleRows.map((s) => [s.id, s.created_at.slice(0, 10)]));
    const points = items
      .map((it) => ({ date: byId.get(it.sale_id) ?? "", value: Number(it.quantity ?? 0) }))
      .filter((p) => p.date);
    return { points, agg: "sum", unit: "unidades" };
  }

  if (key === "cantidad_tickets") {
    return {
      points: saleRows.map((s) => ({ date: s.created_at.slice(0, 10), value: 1 })),
      agg: "sum",
      unit: "unidades",
    };
  }

  if (key === "ticket_promedio") {
    const byDay = new Map<string, { total: number; count: number }>();
    for (const s of saleRows) {
      const day = s.created_at.slice(0, 10);
      const entry = byDay.get(day) ?? { total: 0, count: 0 };
      entry.total += Number(s.total ?? 0);
      entry.count += 1;
      byDay.set(day, entry);
    }
    return {
      points: [...byDay.entries()].map(([date, v]) => ({ date, value: v.count ? v.total / v.count : 0 })),
      agg: "mean",
      unit: "moneda",
    };
  }

  return {
    points: saleRows.map((s) => ({ date: s.created_at.slice(0, 10), value: Number(s.total ?? 0) })),
    agg: "sum",
    unit: "moneda",
  };
}

async function loadSaleItems(supabase: AnyClient, saleIds: string[]) {
  const rows: { sale_id: string; product_id: string | null; description: string; quantity: number; line_total: number }[] = [];
  for (let i = 0; i < saleIds.length; i += 200) {
    const chunk = saleIds.slice(i, i + 200);
    if (chunk.length === 0) break;
    const { data } = await supabase
      .from("sale_items")
      .select("sale_id, product_id, description, quantity, line_total")
      .in("sale_id", chunk);
    rows.push(...((data ?? []) as any[]));
  }
  return rows;
}

/** Recomendaciones de reposición para la familia "productos". */
async function buildRecommendations(supabase: AnyClient, job: Job, horizonDays: number, historyDays: number) {
  const { data: sales } = await scopeFilter(
    supabase
      .from("sales")
      .select("id")
      .eq("status", "completada")
      .gte("created_at", `${job.history_from}T00:00:00Z`)
      .lte("created_at", `${job.history_to}T23:59:59Z`),
    job,
  );
  const ids = ((sales ?? []) as { id: string }[]).map((s) => s.id);
  const items = await loadSaleItems(supabase, ids);

  const perProduct = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const it of items) {
    if (!it.product_id) continue;
    const entry = perProduct.get(it.product_id) ?? { name: it.description, qty: 0, revenue: 0 };
    entry.qty += Number(it.quantity ?? 0);
    entry.revenue += Number(it.line_total ?? 0);
    perProduct.set(it.product_id, entry);
  }

  let stockQuery = supabase.from("stock_levels").select("product_id, location_id, quantity, min_quantity");
  if (job.location_id) stockQuery = stockQuery.eq("location_id", job.location_id);
  const { data: stock } = await stockQuery;
  const stockByProduct = new Map<string, { quantity: number; min: number }>();
  for (const row of (stock ?? []) as any[]) {
    const entry = stockByProduct.get(row.product_id) ?? { quantity: 0, min: 0 };
    entry.quantity += Number(row.quantity ?? 0);
    entry.min += Number(row.min_quantity ?? 0);
    stockByProduct.set(row.product_id, entry);
  }

  const days = Math.max(1, historyDays);
  return [...perProduct.entries()]
    .map(([productId, info]) => {
      const dailyRate = info.qty / days;
      const demand = dailyRate * horizonDays;
      const onHand = stockByProduct.get(productId)?.quantity ?? 0;
      const minimum = stockByProduct.get(productId)?.min ?? 0;
      const gap = demand + minimum - onHand;
      const stockoutRisk = demand > 0 ? Math.min(1, Math.max(0, (demand - onHand) / demand)) : 0;
      const overstockRisk = demand > 0 ? Math.min(1, Math.max(0, (onHand - demand * 2) / (demand * 2))) : onHand > 0 ? 1 : 0;
      return {
        job_id: job.id,
        organization_id: job.organization_id,
        location_id: job.location_id,
        point_of_sale_id: job.point_of_sale_id,
        product_id: productId,
        product_name: info.name,
        action: gap > 0 ? "reponer" : overstockRisk > 0.5 ? "reducir_compra" : "mantener",
        recommended_quantity: gap > 0 ? Math.ceil(gap) : 0,
        forecast_demand: Number(demand.toFixed(2)),
        historical_sales: info.qty,
        stock_on_hand: onHand,
        coverage_days: dailyRate > 0 ? Math.round(onHand / dailyRate) : null,
        stockout_risk: Number(stockoutRisk.toFixed(3)),
        overstock_risk: Number(overstockRisk.toFixed(3)),
        confidence: Number(Math.min(0.95, 0.4 + Math.min(0.5, info.qty / 200)).toFixed(2)),
        currency_code: job.currency_code,
        reason:
          gap > 0
            ? `Se estiman ${Math.round(demand)} unidades de demanda y hay ${onHand} en stock.`
            : `El stock disponible (${onHand}) cubre la demanda estimada (${Math.round(demand)}).`,
      };
    })
    .sort((a, b) => (b.recommended_quantity ?? 0) - (a.recommended_quantity ?? 0))
    .slice(0, 25);
}

/** Informe narrativo con Lovable AI (si falla, el trabajo igual se completa). */
async function generateReport(payload: Record<string, unknown>): Promise<{ summary: string; model: string } | null> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return null;
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "system",
            content:
              "Sos analista de negocio de una empresa de fotografía en parques. Redactá en español rioplatense, claro y breve (máximo 180 palabras). Usá SOLO los números provistos, nunca inventes datos. Cerrá con 2 o 3 acciones concretas.",
          },
          { role: "user", content: JSON.stringify(payload) },
        ],
      }),
    });
    if (!response.ok) return null;
    const json: any = await response.json();
    const summary = json?.choices?.[0]?.message?.content;
    return typeof summary === "string" && summary.trim() ? { summary: summary.trim(), model: "google/gemini-3.6-flash" } : null;
  } catch {
    return null;
  }
}

/** Pipeline completo del trabajo. Devuelve el estado final. */
export async function runPredictionJobPipeline(supabase: AnyClient, jobId: string, userId?: string | null) {
  const { data: jobRow, error } = await supabase.from("ml_prediction_jobs").select("*").eq("id", jobId).single();
  if (error || !jobRow) throw new Error(error?.message ?? "No se encontró el trabajo de predicción.");
  const job = jobRow as Job;

  const { data: target } = await supabase
    .from("ml_prediction_targets")
    .select("key, family, display_name, unit")
    .eq("key", job.target_key)
    .maybeSingle();
  const family = (target as any)?.family ?? "ventas";

  const setStatus = (status: string, message: string) =>
    supabase.from("ml_prediction_jobs").update({ status, status_message: message }).eq("id", jobId);

  try {
    await setStatus("preparando_datos", "Consolidando el histórico registrado.");
    const { points, agg } = await loadSeries(supabase, job, family);
    const daily = fillDaily(points, job.history_from, job.history_to);
    const buckets = bucketize(daily, job.granularity, agg);
    if (buckets.length < 6) {
      await setStatus("datos_insuficientes", "El histórico no alcanza para armar una serie confiable.");
      return { status: "datos_insuficientes" };
    }

    await setStatus("entrenando", "Analizando tendencia y estacionalidad del histórico.");
    const values = buckets.map((b) => b.value);
    const future = futureBuckets(job.horizon_from, job.horizon_to, job.granularity);
    const fit = fitSeries(values, job.granularity);
    const forecast = fit.forecast(future.length);

    await setStatus("evaluando", "Validando el modelo contra el histórico reciente.");
    const metrics = backtest(values, job.granularity, Math.max(2, Math.min(future.length, 12)));

    await supabase.from("ml_predictions").delete().eq("job_id", jobId);
    const historyRows = buckets.slice(-24).map((b) => ({
      job_id: jobId,
      organization_id: job.organization_id,
      location_id: job.location_id,
      point_of_sale_id: job.point_of_sale_id,
      period_start: b.start,
      period_end: b.end,
      is_history: true,
      actual_value: Number(b.value.toFixed(2)),
      currency_code: job.currency_code,
      model_id: MODEL_ID,
      confidence_level: 0.8,
    }));
    const forecastRows = future.map((b, i) => ({
      job_id: jobId,
      organization_id: job.organization_id,
      location_id: job.location_id,
      point_of_sale_id: job.point_of_sale_id,
      period_start: b.start,
      period_end: b.end,
      is_history: false,
      predicted_value: Number(forecast[i]!.value.toFixed(2)),
      lower_bound: Number(forecast[i]!.lower.toFixed(2)),
      upper_bound: Number(forecast[i]!.upper.toFixed(2)),
      currency_code: job.currency_code,
      model_id: MODEL_ID,
      confidence_level: 0.8,
    }));
    await supabase.from("ml_predictions").insert([...historyRows, ...forecastRows]);

    await supabase.from("ml_model_evaluations").delete().eq("job_id", jobId);
    if (metrics) {
      await supabase.from("ml_model_evaluations").insert({
        job_id: jobId,
        organization_id: job.organization_id,
        location_id: job.location_id,
        target_key: job.target_key,
        model_id: MODEL_ID,
        is_selected: true,
        mae: Number(metrics.mae.toFixed(4)),
        rmse: Number(metrics.rmse.toFixed(4)),
        mape: metrics.mape === null ? null : Number(metrics.mape.toFixed(4)),
        wape: metrics.wape === null ? null : Number(metrics.wape.toFixed(4)),
        bias: Number(metrics.bias.toFixed(4)),
        interval_coverage: Number(metrics.coverage.toFixed(3)),
        folds: metrics.folds,
        beats_baseline: metrics.beatsBaseline,
        backtest_from: buckets[Math.max(0, buckets.length - future.length)]?.start ?? job.history_from,
        backtest_to: buckets[buckets.length - 1]?.end ?? job.history_to,
        details: { engine: "local", granularity: job.granularity, buckets: buckets.length },
      });
    }

    const horizonDays = Math.max(
      1,
      Math.round((new Date(job.horizon_to).getTime() - new Date(job.horizon_from).getTime()) / 86_400_000),
    );
    await supabase.from("ml_recommendations").delete().eq("job_id", jobId).eq("decision", "pendiente");
    if (family === "productos") {
      const historyDays = Math.max(
        1,
        Math.round((new Date(job.history_to).getTime() - new Date(job.history_from).getTime()) / 86_400_000),
      );
      const recs = await buildRecommendations(supabase, job, horizonDays, historyDays);
      if (recs.length > 0) await supabase.from("ml_recommendations").insert(recs as never);
    }

    await setStatus("generando_informe", "Redactando el informe del período.");
    const totalForecast = forecast.reduce((acc, f) => acc + f.value, 0);
    const lastHistory = values.slice(-future.length || -1).reduce((acc, v) => acc + v, 0);
    const report = await generateReport({
      objetivo: (target as any)?.display_name ?? job.target_key,
      unidad: (target as any)?.unit ?? "moneda",
      moneda: job.currency_code,
      granularidad: job.granularity,
      periodo: [job.horizon_from, job.horizon_to],
      historico_periodo: [job.history_from, job.history_to],
      total_estimado: Number(totalForecast.toFixed(2)),
      total_comparable_historico: Number(lastHistory.toFixed(2)),
      serie_estimada: forecastRows.slice(0, 20).map((r) => ({
        desde: r.period_start,
        hasta: r.period_end,
        valor: r.predicted_value,
        min: r.lower_bound,
        max: r.upper_bound,
      })),
      metricas: metrics,
    });

    await supabase.from("ml_generated_reports").delete().eq("job_id", jobId);
    if (report) {
      await supabase.from("ml_generated_reports").insert({
        job_id: jobId,
        organization_id: job.organization_id,
        created_by: userId ?? null,
        language: "es",
        summary: report.summary,
        model_reference: report.model,
        disclaimer: FORECAST_DISCLAIMER,
        content: { total_estimado: Number(totalForecast.toFixed(2)), metricas: metrics },
      } as never);
    }

    await supabase
      .from("ml_prediction_jobs")
      .update({
        status: "completado",
        status_message: `Predicción generada con el motor local sobre ${buckets.length} períodos históricos.`,
        metrics: metrics ?? {},
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return { status: "completado", total: Number(totalForecast.toFixed(2)) };
  } catch (err) {
    await setStatus("error", `No se pudo completar la predicción: ${(err as Error).message}`.slice(0, 400));
    return { status: "error", message: (err as Error).message };
  }
}