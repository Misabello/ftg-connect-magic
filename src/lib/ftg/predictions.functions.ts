import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { evaluateSufficiency, historyRange, type Granularity } from "@/lib/ftg/predictions";

const requestSchema = z.object({
  target_key: z.string().trim().min(2).max(60),
  organization_id: z.string().uuid().nullable().optional(),
  location_id: z.string().uuid().nullable().optional(),
  point_of_sale_id: z.string().uuid().nullable().optional(),
  country_code: z.string().trim().length(2).nullable().optional(),
  granularity: z.enum(["diario", "semanal", "mensual"]),
  horizon_from: z.string().min(8).max(10),
  horizon_to: z.string().min(8).max(10),
  currency_code: z.string().trim().min(3).max(3).default("ARS"),
  filters: z
    .object({
      product_id: z.string().uuid().nullable().optional(),
      category_id: z.string().uuid().nullable().optional(),
      season: z.string().trim().max(40).nullable().optional(),
    })
    .default({}),
  title: z.string().trim().max(160).optional(),
});

/** Catálogo de objetivos disponibles para el selector. */
export const listPredictionTargets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ml_prediction_targets")
      .select("key, family, display_name, display_name_pt, description, unit, min_history_days, min_observations, supports_product_detail, sort_order")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Últimas solicitudes de predicción visibles para el usuario. */
export const listPredictionJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ml_prediction_jobs")
      .select(
        "id, target_key, granularity, horizon_from, horizon_to, history_from, history_to, status, status_message, observations_used, history_days, currency_code, location_id, point_of_sale_id, filters, metrics, saved, title, requested_at, finished_at",
      )
      .order("requested_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

type CountResult = { observations: number; distinctDays: number };

/** Cuenta el histórico REAL disponible para el objetivo y alcance pedidos. */
async function countHistory(
  supabase: any,
  family: string,
  scope: { organization_id?: string | null; location_id?: string | null; point_of_sale_id?: string | null },
  from: string,
  to: string,
): Promise<CountResult> {
  const applyScope = (query: any, locationField = "location_id") => {
    let q = query;
    if (scope.point_of_sale_id) q = q.eq("point_of_sale_id", scope.point_of_sale_id);
    else if (scope.location_id) q = q.eq(locationField, scope.location_id);
    else if (scope.organization_id) q = q.eq("organization_id", scope.organization_id);
    return q;
  };

  if (family === "costos") {
    const { data } = await applyScope(
      supabase.from("pos_tickets").select("issued_on").in("kind", ["compra", "gasto"]).gte("issued_on", from).lte("issued_on", to),
    );
    const rows = (data ?? []) as { issued_on: string | null }[];
    const days = new Set(rows.map((r) => r.issued_on).filter(Boolean));
    if (rows.length > 0) return { observations: rows.length, distinctDays: days.size };
    const { data: docs } = await supabase
      .from("finance_documents")
      .select("issue_date")
      .eq("kind", "pagar")
      .gte("issue_date", from)
      .lte("issue_date", to);
    const docRows = (docs ?? []) as { issue_date: string | null }[];
    return {
      observations: docRows.length,
      distinctDays: new Set(docRows.map((r) => r.issue_date).filter(Boolean)).size,
    };
  }

  // ventas y productos comparten el histórico de ventas confirmadas
  const { data } = await applyScope(
    supabase
      .from("sales")
      .select("id, created_at")
      .eq("status", "completada")
      .gte("created_at", `${from}T00:00:00Z`)
      .lte("created_at", `${to}T23:59:59Z`),
  );
  const rows = (data ?? []) as { id: string; created_at: string }[];
  const days = new Set(rows.map((r) => r.created_at.slice(0, 10)));
  return { observations: rows.length, distinctDays: days.size };
}

/**
 * Crea el trabajo asincrónico de predicción.
 * Nunca devuelve cifras: valida el histórico real y delega el cálculo
 * al servicio de modelos. Si no alcanzan los datos, lo deja registrado.
 */
export const requestPrediction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => requestSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: target, error: targetError } = await supabase
      .from("ml_prediction_targets")
      .select("key, family, display_name, min_history_days, min_observations, unit")
      .eq("key", data.target_key)
      .maybeSingle();
    if (targetError) throw new Error(targetError.message);
    if (!target) throw new Error("El objetivo de predicción seleccionado no existe.");

    const horizonDays = Math.max(
      1,
      Math.round((new Date(data.horizon_to).getTime() - new Date(data.horizon_from).getTime()) / 86_400_000),
    );
    const history = historyRange(target.min_history_days, horizonDays);

    const scope = {
      organization_id: data.organization_id ?? null,
      location_id: data.location_id ?? null,
      point_of_sale_id: data.point_of_sale_id ?? null,
    };
    const counted = await countHistory(supabase, target.family, scope, history.from, history.to);
    const sufficiency = evaluateSufficiency({
      observations: counted.observations,
      distinctDays: counted.distinctDays,
      minObservations: target.min_observations,
      minHistoryDays: target.min_history_days,
    });

    const serviceUrl = process.env["ML_SERVICE_URL"];
    const status = !sufficiency.ok ? "datos_insuficientes" : serviceUrl ? "en_cola" : "pendiente";
    const statusMessage = !sufficiency.ok
      ? sufficiency.reason
      : serviceUrl
        ? "Solicitud enviada al servicio de modelos."
        : "El servicio de modelos todavía no está conectado. La solicitud queda registrada y se procesará al activarlo.";

    const { data: job, error } = await supabase
      .from("ml_prediction_jobs")
      .insert({
        organization_id: data.organization_id ?? null,
        country_code: data.country_code ?? null,
        location_id: data.location_id ?? null,
        point_of_sale_id: data.point_of_sale_id ?? null,
        target_key: data.target_key,
        granularity: data.granularity as Granularity,
        horizon_from: data.horizon_from,
        horizon_to: data.horizon_to,
        history_from: history.from,
        history_to: history.to,
        filters: data.filters ?? {},
        currency_code: data.currency_code,
        status,
        status_message: statusMessage,
        observations_used: counted.observations,
        history_days: counted.distinctDays,
        requested_by: userId,
        title: data.title ?? target.display_name,
      } as never)
      .select("id, status, status_message, observations_used, history_days")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("audit_logs").insert({
      organization_id: data.organization_id ?? null,
      user_id: userId,
      action: "ml.prediction_requested",
      entity: "ml_prediction_jobs",
      entity_id: job.id,
      details: {
        target: data.target_key,
        horizon: [data.horizon_from, data.horizon_to],
        granularity: data.granularity,
        status,
      },
    } as never);

    if (sufficiency.ok && serviceUrl) {
      try {
        await fetch(`${serviceUrl.replace(/\/$/, "")}/jobs`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(process.env["ML_SERVICE_TOKEN"] ? { authorization: `Bearer ${process.env["ML_SERVICE_TOKEN"]}` } : {}),
          },
          body: JSON.stringify({ job_id: job.id }),
        });
      } catch (err) {
        await supabase
          .from("ml_prediction_jobs")
          .update({
            status: "error",
            status_message: `No se pudo contactar al servicio de modelos: ${(err as Error).message}`,
          } as never)
          .eq("id", job.id);
      }
    }

    return {
      job_id: job.id as string,
      status: job.status as string,
      message: job.status_message as string | null,
      observations: counted.observations,
      history_days: counted.distinctDays,
      history_from: history.from,
      history_to: history.to,
    };
  });

/** Detalle de un trabajo: predicciones, recomendaciones, métricas e informe. */
export const getPredictionJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ job_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [job, predictions, recommendations, evaluations, reports] = await Promise.all([
      supabase.from("ml_prediction_jobs").select("*").eq("id", data.job_id).maybeSingle(),
      supabase.from("ml_predictions").select("*").eq("job_id", data.job_id).order("period_start"),
      supabase.from("ml_recommendations").select("*").eq("job_id", data.job_id),
      supabase.from("ml_model_evaluations").select("*").eq("job_id", data.job_id),
      supabase.from("ml_generated_reports").select("*").eq("job_id", data.job_id).order("created_at", { ascending: false }),
    ]);
    if (job.error) throw new Error(job.error.message);
    return {
      job: job.data,
      predictions: predictions.data ?? [],
      recommendations: recommendations.data ?? [],
      evaluations: evaluations.data ?? [],
      reports: reports.data ?? [],
    };
  });

/** Decisión del supervisor sobre una recomendación (nunca ejecuta compras). */
export const decideRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["pendiente", "aprobada", "descartada", "ajustada", "reposicion_solicitada"]),
        decided_quantity: z.number().nonnegative().nullable().optional(),
        decision_comment: z.string().trim().max(500).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ml_recommendations")
      .update({
        decision: data.decision,
        decided_quantity: data.decided_quantity ?? null,
        decision_comment: data.decision_comment ?? null,
        decided_by: context.userId,
        decided_at: new Date().toISOString(),
      } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await context.supabase.from("audit_logs").insert({
      user_id: context.userId,
      action: "ml.recommendation_decided",
      entity: "ml_recommendations",
      entity_id: data.id,
      details: { decision: data.decision, quantity: data.decided_quantity ?? null },
    } as never);
    return { ok: true };
  });
