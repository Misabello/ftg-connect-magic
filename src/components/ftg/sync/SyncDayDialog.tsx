import { CheckCircle2, CloudOff, Download, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useDaySync } from "@/hooks/useDaySync";
import { useScope } from "@/hooks/useScope";
import { ENTITY_LABELS, deviceIdentifier, type PendingOperation } from "@/lib/ftg/offline.db";
import { formatMoney, relativeTime } from "@/lib/ftg/format";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  posName?: string | undefined;
  cashSessionLabel?: string | undefined;
  userName?: string | undefined;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function summarize(ops: PendingOperation[]) {
  const counts: Record<string, number> = {};
  const totals: Record<string, number> = {};
  for (const op of ops) {
    counts[op.entityType] = (counts[op.entityType] ?? 0) + 1;
    if (op.amount && op.currency) totals[op.currency] = (totals[op.currency] ?? 0) + op.amount;
  }
  return { counts, totals };
}

export function SyncDayDialog({ open, onOpenChange, posName, cashSessionLabel, userName }: Props) {
  const { activeLocation, online } = useScope();
  const { pendingData, pendingFiles, progress, start, lastSync, awaiting } = useDaySync();
  const [elapsed, setElapsed] = useState(0);
  const [stage, setStage] = useState<"resumen" | "progreso" | "resultado">("resumen");

  const { counts, totals } = useMemo(() => summarize(pendingData), [pendingData]);

  useEffect(() => {
    if (!open) setStage("resumen");
  }, [open]);

  useEffect(() => {
    if (progress.phase === "enviando" || progress.phase === "preparando") setStage("progreso");
    if (["completado", "parcial", "error", "sin_conexion"].includes(progress.phase) && stage === "progreso") {
      setStage("resultado");
    }
  }, [progress.phase, stage]);

  useEffect(() => {
    if (stage !== "progreso" || !progress.startedAt) return;
    const timer = window.setInterval(() => setElapsed(Math.round((Date.now() - progress.startedAt!) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [stage, progress.startedAt]);

  const percent = progress.total > 0 ? Math.round((progress.sent / progress.total) * 100) : 0;

  const handleSync = async () => {
    setStage("progreso");
    const result = await start();
    if (result?.phase === "sin_conexion") setStage("resultado");
  };

  const downloadSummary = () => {
    const lines = [
      `Lote: ${progress.batchId ?? "-"}`,
      `Fecha: ${new Date().toLocaleString("es-AR")}`,
      `Operaciones enviadas: ${progress.sent}`,
      `Confirmadas: ${progress.confirmed}`,
      `Ya existentes: ${progress.duplicated}`,
      `Requieren revisión: ${progress.review}`,
      `Con error: ${progress.failed}`,
      `Pendientes: ${progress.pending}`,
      ...Object.entries(progress.manifest?.totalsByCurrency ?? {}).map(([c, v]) => `Importe ${c}: ${formatMoney(v, c)}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `comprobante-sync-${(progress.batchId ?? "lote").slice(0, 8)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {stage === "resumen" && (
          <>
            <DialogHeader>
              <DialogTitle>Operaciones listas para enviar</DialogTitle>
              <DialogDescription>
                Se envían automáticamente todas las operaciones pendientes de este punto de venta.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Row label="Fecha de la jornada" value={new Date().toLocaleDateString("es-AR")} />
              <Row label="País" value={activeLocation?.country_code ?? "-"} />
              <Row label="Parque" value={activeLocation?.name ?? "-"} />
              <Row label="Punto de venta" value={posName ?? "-"} />
              <Row label="Caja" value={cashSessionLabel ?? "Sin caja abierta"} />
              <Row label="Dispositivo" value={deviceIdentifier().slice(0, 8)} />
              <Row label="Usuario" value={userName ?? "-"} />
              <Separator className="my-2" />
              {Object.entries(ENTITY_LABELS).map(([key, label]) =>
                counts[key] ? <Row key={key} label={label} value={String(counts[key])} /> : null,
              )}
              {pendingFiles.length > 0 && <Row label="Archivos pesados" value={String(pendingFiles.length)} />}
              <Separator className="my-2" />
              {Object.entries(totals).map(([currency, value]) => (
                <Row key={currency} label={`Importe total ${currency}`} value={formatMoney(value, currency)} />
              ))}
              <Row label="Última sincronización" value={lastSync ? relativeTime(lastSync) : "Sin registros"} />
              {!online && (
                <p className="rounded-md bg-muted p-3 text-sm">
                  No hay conexión. Tus operaciones están guardadas en este dispositivo y se sincronizarán cuando vuelva
                  Internet.
                </p>
              )}
              {awaiting && <Badge variant="secondary">Esperando conexión</Badge>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSync} disabled={pendingData.length === 0}>
                Sincronizar ahora
              </Button>
            </DialogFooter>
          </>
        )}

        {stage === "progreso" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Sincronizando operaciones
              </DialogTitle>
              <DialogDescription>{progress.currentLabel || "Preparando datos"}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Progress value={percent} />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Row label="Progreso" value={`${percent}%`} />
                <Row label="Tiempo" value={`${elapsed}s`} />
                <Row label="Enviadas" value={String(progress.sent)} />
                <Row label="Pendientes" value={String(Math.max(0, progress.total - progress.sent))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Trabajar en segundo plano
              </Button>
            </DialogFooter>
          </>
        )}

        {stage === "resultado" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {progress.phase === "completado" ? (
                  <>
                    <CheckCircle2 className="size-4 text-primary" /> Jornada sincronizada
                  </>
                ) : progress.phase === "sin_conexion" ? (
                  <>
                    <CloudOff className="size-4" /> Sin conexión
                  </>
                ) : (
                  <>
                    <TriangleAlert className="size-4 text-destructive" /> Algunas operaciones requieren atención
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {progress.phase === "sin_conexion"
                  ? "No hay conexión. Tus operaciones están guardadas en este dispositivo y se sincronizarán cuando vuelva Internet."
                  : `Lote ${progress.batchId?.slice(0, 8) ?? "-"} · ${new Date().toLocaleTimeString("es-AR")}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Row label="Enviadas" value={String(progress.sent)} />
              <Row label="Confirmadas" value={String(progress.confirmed)} />
              <Row label="Ya existentes" value={String(progress.duplicated)} />
              <Row label="Requieren revisión" value={String(progress.review)} />
              <Row label="Con error" value={String(progress.failed)} />
              <Row label="Pendientes" value={String(progress.pending)} />
              {Object.entries(progress.manifest?.totalsByCurrency ?? {}).map(([currency, value]) => (
                <Row key={currency} label={`Importe total ${currency}`} value={formatMoney(value, currency)} />
              ))}
              {progress.errors.slice(0, 5).map((error, index) => (
                <p key={index} className="text-sm text-destructive">
                  {error.label}: {error.message}
                </p>
              ))}
            </div>
            <DialogFooter className="flex-wrap gap-2">
              <Button variant="outline" onClick={downloadSummary}>
                <Download className="mr-2 size-4" /> Descargar resumen
              </Button>
              {progress.pending > 0 && (
                <Button variant="secondary" onClick={handleSync}>
                  <RefreshCw className="mr-2 size-4" /> Reintentar pendientes
                </Button>
              )}
              <Button onClick={() => onOpenChange(false)}>Continuar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
