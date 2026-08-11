import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, Loading, Panel } from "@/components/ftg/supervision/SupervisionShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useScope } from "@/hooks/useScope";
import { formatNumber, relativeTime } from "@/lib/ftg/format";
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
  const { activeLocationId, activeLocation } = useScope();
  const queryClient = useQueryClient();

  const fetchTargets = useServerFn(listPredictionTargets);
  const fetchJobs = useServerFn(listPredictionJobs);
  const submit = useServerFn(requestPrediction);

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
          location_id: activeLocationId,
          granularity,
          horizon_from: range.from,
          horizon_to: range.to,
          currency_code: activeLocation?.currency_code ?? "ARS",
          filters: {},
        },
      } as never);
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["ml-jobs"] });
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
            <Label>Alcance</Label>
            <Input value={activeLocation?.name ?? ""} readOnly />
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
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
