import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, ExternalLink, Sparkles, Table2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, Loading, Panel } from "@/components/ftg/supervision/SupervisionShell";
import { BarChartRace, ShareRibbon, StoryForecastChart } from "@/components/ftg/charts/FlourishCharts";
import { LookerStudioPanel } from "@/components/ftg/charts/LookerStudioPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useScope } from "@/hooks/useScope";
import { formatNumber, relativeTime } from "@/lib/ftg/format";
import { copyForSheets, downloadCsv } from "@/lib/ftg/export";
import { exportRowsToSheet } from "@/lib/ftg/sheets.functions";
import {
  FORECAST_DISCLAIMER,
  GRANULARITY_LABELS,
  HORIZON_PRESETS,
  JOB_STATUS_LABELS,
  horizonRange,
  type Granularity,
  type HorizonKey,
} from "@/lib/ftg/predictions";
import {
  listPredictionJobs,
  listPredictionTargets,
  getPredictionJob,
  rerunPrediction,
  requestPrediction,
} from "@/lib/ftg/predictions.functions";

export const Route = createFileRoute("/_authenticated/supervisores/predicciones")({
  head: () => ({
    meta: [
      { title: "Predicciones con IA — Supervisores FTG ONE" },
      { name: "description", content: "Estimaciones de ventas, costos y productos a partir del histórico real del parque." },
      { property: "og:title", content: "Predicciones con IA — Supervisores FTG ONE" },
      { property: "og:description", content: "Predicciones basadas en el histórico registrado, sin datos inventados." },
    ],
  }),
  component: Predicciones,
});

function Predicciones() {
  const { activeLocationId, activeLocation, locations } = useScope();
  const queryClient = useQueryClient();
  const [scopeLocationId, setScopeLocationId] = useState<string>("all");

  useEffect(() => {
    if (activeLocationId) setScopeLocationId(activeLocationId);
  }, [activeLocationId]);

  const scopeLocation = locations.find((l) => l.id === scopeLocationId) ?? null;

  const fetchTargets = useServerFn(listPredictionTargets);
  const fetchJobs = useServerFn(listPredictionJobs);
  const submit = useServerFn(requestPrediction);
  const fetchJob = useServerFn(getPredictionJob);
  const rerun = useServerFn(rerunPrediction);
  const [openJobId, setOpenJobId] = useState<string | null>(null);

  const jobDetail = useQuery({
    queryKey: ["ml-job", openJobId],
    enabled: !!openJobId,
    queryFn: () => fetchJob({ data: { job_id: openJobId } } as never),
  });

  const rerunMutation = useMutation({
    mutationFn: (jobId: string) => rerun({ data: { job_id: jobId } } as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ml-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["ml-job"] });
      toast.success("Predicción recalculada.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const targets = useQuery({ queryKey: ["ml-targets"], queryFn: () => fetchTargets({} as never) });
  const jobs = useQuery({ queryKey: ["ml-jobs"], queryFn: () => fetchJobs({} as never), refetchInterval: 20_000 });

  const [targetKey, setTargetKey] = useState<string>("");
  const [granularity, setGranularity] = useState<Granularity>("diario");
  const [horizon, setHorizon] = useState<HorizonKey>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const selectedTarget = targets.data?.find((t) => t.key === targetKey);

  const mutation = useMutation({
    mutationFn: async () => {
      const range = horizon === "custom" ? { from: customFrom, to: customTo } : horizonRange(horizon);
      if (!range?.from || !range?.to) throw new Error("Indicá el período a predecir.");
      if (!targetKey) throw new Error("Elegí qué querés predecir.");
      return submit({
        data: {
          target_key: targetKey,
          organization_id: null,
          location_id: scopeLocationId === "all" ? null : scopeLocationId,
          granularity,
          horizon_from: range.from,
          horizon_to: range.to,
          currency_code: scopeLocation?.currency_code ?? activeLocation?.currency_code ?? "ARS",
          filters: {},
        },
      } as never);
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["ml-jobs"] });
      if (result.job_id) setOpenJobId(result.job_id);
      if (result.status === "datos_insuficientes") {
        toast.warning(result.message ?? "No hay datos suficientes para predecir.");
      } else {
        toast.success(result.message ?? "Solicitud registrada.");
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (targets.isLoading) return <Loading />;

  return (
    <div className="space-y-4">
      <Panel title="Nueva predicción" hint="Elegí qué querés estimar y para qué período">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label>¿Qué querés predecir?</Label>
            <Select value={targetKey} onValueChange={setTargetKey}>
              <SelectTrigger>
                <SelectValue placeholder="Elegí un objetivo" />
              </SelectTrigger>
              <SelectContent>
                {(targets.data ?? []).map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTarget?.description && (
              <p className="text-xs text-muted-foreground">{selectedTarget.description}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Período a predecir</Label>
            <Select value={horizon} onValueChange={(v) => setHorizon(v as HorizonKey)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HORIZON_PRESETS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Detalle</Label>
            <Select value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(GRANULARITY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Sede</Label>
            <Select value={scopeLocationId} onValueChange={setScopeLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Elegí una sede" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las sedes</SelectItem>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                    {l.city ? ` · ${l.city}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {horizon === "custom" && (
            <>
              <div className="space-y-1.5">
                <Label>Desde</Label>
                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Hasta</Label>
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="max-w-xl text-xs text-muted-foreground">{FORECAST_DISCLAIMER}</p>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !targetKey}>
            <Sparkles className="mr-2 h-4 w-4" />
            {mutation.isPending ? "Solicitando…" : "Generar predicción"}
          </Button>
        </div>
      </Panel>

      <Panel title="Historial de predicciones" hint="Cada solicitud queda registrada con su estado y su período">
        {(jobs.data ?? []).length === 0 ? (
          <EmptyState message="Todavía no solicitaste predicciones." />
        ) : (
          <ul className="divide-y divide-border text-sm">
            {(jobs.data ?? []).map((job: any) => (
              <li key={job.id} className="space-y-1 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{job.title ?? job.target_key}</span>
                  <Badge
                    variant={
                      job.status === "completado"
                        ? "default"
                        : job.status === "error" || job.status === "datos_insuficientes"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {JOB_STATUS_LABELS[job.status] ?? job.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {job.horizon_from} a {job.horizon_to} · {GRANULARITY_LABELS[job.granularity as Granularity]} ·{" "}
                  {formatNumber(job.observations_used ?? 0)} registros históricos · {relativeTime(job.requested_at)}
                </p>
                {job.status_message && <p className="text-xs text-muted-foreground">{job.status_message}</p>}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => setOpenJobId(openJobId === job.id ? null : job.id)}>
                    {openJobId === job.id ? "Ocultar resultado" : "Ver resultado"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={rerunMutation.isPending}
                    onClick={() => rerunMutation.mutate(job.id)}
                  >
                    Recalcular
                  </Button>
                </div>
                {openJobId === job.id && <JobDetail detail={jobDetail.data} loading={jobDetail.isLoading} />}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function JobDetail({ detail, loading }: { detail: any; loading: boolean }) {
  if (loading) return <Loading />;
  if (!detail?.job) return null;
  const forecast = (detail.predictions ?? []).filter((p: any) => !p.is_history);
  const history = (detail.predictions ?? []).filter((p: any) => p.is_history);
  const evaluation = (detail.evaluations ?? [])[0];
  const report = (detail.reports ?? [])[0];
  const total = forecast.reduce((acc: number, p: any) => acc + Number(p.predicted_value ?? 0), 0);
  const average = forecast.length > 0 ? total / forecast.length : 0;
  const best = forecast.reduce(
    (acc: any, p: any) => (Number(p.predicted_value ?? 0) > Number(acc?.predicted_value ?? -Infinity) ? p : acc),
    null,
  );
  const historyTotal = history.reduce((acc: number, p: any) => acc + Number(p.actual_value ?? 0), 0);
  const historyAvg = history.length > 0 ? historyTotal / history.length : 0;
  const variation = historyAvg > 0 ? (average - historyAvg) / historyAvg : null;

  const exportHeaders = ["Desde", "Hasta", "Estimado", "Mínimo", "Máximo"];
  const exportRows = forecast.map((p: any) => ({
    Desde: p.period_start,
    Hasta: p.period_end,
    Estimado: Number(p.predicted_value ?? 0),
    Mínimo: Number(p.lower_bound ?? 0),
    Máximo: Number(p.upper_bound ?? 0),
  }));
  const fileBase = `prediccion-${detail.job.target_key ?? "ftg"}-${detail.job.horizon_from ?? ""}`;

  const chartData = (() => {
    const rows = [
      ...history.map((p: any) => ({
        label: p.period_start,
        historico: Number(p.actual_value ?? 0),
        estimado: null as number | null,
        rango: null as [number, number] | null,
      })),
      ...forecast.map((p: any) => ({
        label: p.period_start,
        historico: null as number | null,
        estimado: Number(p.predicted_value ?? 0),
        rango: [Number(p.lower_bound ?? 0), Number(p.upper_bound ?? 0)] as [number, number],
      })),
    ].sort((a, b) => String(a.label).localeCompare(String(b.label)));
    // Une la última barra histórica con la primera estimación para que la línea sea continua.
    const lastHistoryIdx = rows.map((r) => r.historico !== null).lastIndexOf(true);
    if (lastHistoryIdx >= 0 && rows[lastHistoryIdx]) {
      rows[lastHistoryIdx]!.estimado = rows[lastHistoryIdx]!.historico;
    }
    return rows;
  })();

  const splitLabel: string | null = history.length > 0 ? String(history[history.length - 1]?.period_start ?? "") : null;

  // Bar chart race: acumulado por mes a medida que avanza el pronóstico.
  const bucketOf = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  };
  const raceFrames = (() => {
    const ordered = [...forecast].sort((a: any, b: any) =>
      String(a.period_start).localeCompare(String(b.period_start)),
    );
    const acc = new Map<string, number>();
    return ordered.map((p: any) => {
      const bucket = bucketOf(String(p.period_start));
      acc.set(bucket, (acc.get(bucket) ?? 0) + Number(p.predicted_value ?? 0));
      return {
        label: String(p.period_start),
        items: Array.from(acc.entries()).map(([key, value]) => ({ key, value })),
      };
    });
  })();
  const shareSegments = (() => {
    const acc = new Map<string, number>();
    forecast.forEach((p: any) => {
      const bucket = bucketOf(String(p.period_start));
      acc.set(bucket, (acc.get(bucket) ?? 0) + Number(p.predicted_value ?? 0));
    });
    return Array.from(acc.entries()).map(([key, value]) => ({ key, value }));
  })();

  if (forecast.length === 0)
    return (
      <p className="mt-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
        Todavía no hay resultados para esta solicitud.
      </p>
    );

  return (
    <div className="mt-3 animate-fade-in space-y-4 rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => downloadCsv(fileBase, exportRows, exportHeaders)}
        >
          <Download className="h-3.5 w-3.5" /> Descargar CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={async () => {
            try {
              await copyForSheets(exportRows, exportHeaders);
              toast.success("Tabla copiada", { description: "Pegala en Google Sheets con Ctrl/Cmd + V." });
            } catch {
              toast.error("No se pudo copiar. Usá la descarga en CSV.");
            }
          }}
        >
          <Table2 className="h-3.5 w-3.5" /> Copiar para Sheets
        </Button>
        <ExportSheetButton
          title={fileBase}
          headers={exportHeaders}
          rows={exportRows}
          chart={{
            title: `Estimación ${detail.job.target_key ?? "FTG"}`,
            type: "LINE",
            domainHeader: "Desde",
            seriesHeaders: ["Estimado", "Mínimo", "Máximo"],
          }}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total estimado" value={formatNumber(total)} hint={`${forecast.length} períodos proyectados`} />
        <KpiCard label="Promedio por período" value={formatNumber(Math.round(average))} hint="Escenario central (P50)" />
        <KpiCard
          label="Variación vs histórico"
          value={variation === null ? "—" : `${variation >= 0 ? "+" : ""}${(variation * 100).toFixed(1)}%`}
          hint={`${history.length} períodos históricos analizados`}
          tone={variation === null ? "neutral" : variation >= 0 ? "up" : "down"}
        />
        <KpiCard
          label="Pico proyectado"
          value={best ? formatNumber(Number(best.predicted_value ?? 0)) : "—"}
          hint={best ? String(best.period_start) : "Sin datos"}
        />
      </div>

      {evaluation && (
        <p className="text-xs text-muted-foreground">
          Precisión del modelo · error medio {formatNumber(Number(evaluation.mae ?? 0))} · cobertura del rango{" "}
          {Math.round(Number(evaluation.interval_coverage ?? 0) * 100)}%
          {evaluation.beats_baseline ? " · supera al método base" : ""}
        </p>
      )}

      {report?.summary && (
        <div className="space-y-1 rounded-lg border border-border bg-background p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Informe</p>
          <p className="whitespace-pre-line text-sm">{report.summary}</p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-background p-3 shadow-sm">
        <Tabs defaultValue="linea">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Gráfico de estimaciones
            </p>
            <TabsList>
              <TabsTrigger value="linea">Línea del tiempo</TabsTrigger>
              <TabsTrigger value="carrera">Carrera de barras</TabsTrigger>
              <TabsTrigger value="reparto">Reparto</TabsTrigger>
              <TabsTrigger value="looker">Looker Studio</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="linea" className="animate-fade-in">
            <StoryForecastChart data={chartData} splitLabel={splitLabel} />
          </TabsContent>
          <TabsContent value="carrera" className="animate-fade-in">
            <BarChartRace
              frames={raceFrames}
              caption="Acumulado proyectado por período a medida que avanza el pronóstico."
            />
          </TabsContent>
          <TabsContent value="reparto" className="animate-fade-in">
            <ShareRibbon segments={shareSegments} />
          </TabsContent>
          <TabsContent value="looker" className="animate-fade-in">
            <LookerStudioPanel rows={exportRows} headers={exportHeaders} fileBase={fileBase} />
          </TabsContent>
        </Tabs>
      </div>

      <div className="max-h-64 overflow-auto rounded-lg border border-border bg-background">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted/60 text-left">
            <tr>
              <th className="px-3 py-2">Desde</th>
              <th className="px-3 py-2">Hasta</th>
              <th className="px-3 py-2 text-right">Estimado</th>
              <th className="px-3 py-2 text-right">Mínimo</th>
              <th className="px-3 py-2 text-right">Máximo</th>
            </tr>
          </thead>
          <tbody>
            {forecast.map((p: any) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-3 py-1.5">{p.period_start}</td>
                <td className="px-3 py-1.5">{p.period_end}</td>
                <td className="px-3 py-1.5 text-right font-medium">{formatNumber(Number(p.predicted_value ?? 0))}</td>
                <td className="px-3 py-1.5 text-right text-muted-foreground">{formatNumber(Number(p.lower_bound ?? 0))}</td>
                <td className="px-3 py-1.5 text-right text-muted-foreground">{formatNumber(Number(p.upper_bound ?? 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(detail.recommendations ?? []).length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recomendaciones</p>
          <ul className="space-y-1 text-xs">
            {detail.recommendations.slice(0, 8).map((r: any) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 rounded-md bg-background px-3 py-1.5">
                <span>{r.product_name}</span>
                <span className="text-muted-foreground">{r.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">{FORECAST_DISCLAIMER}</p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "up" | "down";
}) {
  return (
    <div className="hover-scale rounded-lg border border-border bg-background p-3 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={
          tone === "up"
            ? "mt-1 text-xl font-semibold text-success"
            : tone === "down"
              ? "mt-1 text-xl font-semibold text-destructive"
              : "mt-1 text-xl font-semibold"
        }
      >
        {value}
      </p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Crea una planilla real en Google Sheets con los datos de la predicción. */
function ExportSheetButton({
  title,
  headers,
  rows,
  chart,
}: {
  title: string;
  headers: string[];
  rows: Record<string, string | number | null | undefined>[];
  chart?: { title: string; type: "LINE" | "COLUMN" | "AREA"; domainHeader: string; seriesHeaders: string[] };
}) {
  const [busy, setBusy] = useState(false);
  const createSheet = useServerFn(exportRowsToSheet);

  return (
    <Button
      size="sm"
      variant="secondary"
      className="gap-1.5"
      disabled={busy || rows.length === 0}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await createSheet({
            data: {
              title: `FTG · ${title}`,
              headers,
              rows: rows.map((r) => headers.map((h) => (r[h] === undefined || r[h] === null ? "" : r[h]!))),
              ...(chart ? { chart } : {}),
            },
          });
          if (res.url) {
            window.open(res.url, "_blank", "noopener");
            toast.success("Planilla creada en Google Sheets", {
              description: res.chart_added
                ? `${res.rows} filas exportadas + hoja con el gráfico.`
                : `${res.rows} filas exportadas.`,
            });
          } else {
            toast.error("La planilla se creó pero no se obtuvo el enlace.");
          }
        } catch (err) {
          toast.error("No se pudo exportar a Google Sheets", { description: (err as Error).message });
        } finally {
          setBusy(false);
        }
      }}
    >
      <ExternalLink className="h-3.5 w-3.5" /> {busy ? "Exportando…" : "Exportar a Google Sheets"}
    </Button>
  );
}
