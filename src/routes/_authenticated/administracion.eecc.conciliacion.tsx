import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Loader2, ScaleIcon, TriangleAlert } from "lucide-react";

import { ExportMenu } from "@/components/ftg/admin/ExportMenu";
import { PeriodSelect } from "@/components/ftg/admin/PeriodSelect";
import { StatCard } from "@/components/ftg/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useScope } from "@/hooks/useScope";
import { PERIOD_OPTIONS } from "@/lib/ftg/eecc";
import { formatMoney } from "@/lib/ftg/format";
import {
  ISSUE_HINT,
  ISSUE_LABEL,
  useFlowReconciliation,
  type ReconciliationIssue,
} from "@/lib/ftg/reconciliation";

export const Route = createFileRoute("/_authenticated/administracion/eecc/conciliacion")({
  component: ConciliacionFlujo,
});

const ISSUES: ReconciliationIssue[] = ["sin_asiento", "sin_postear", "importe", "huerfano"];

function ConciliacionFlujo() {
  const { activeLocation, activeLocationId } = useScope();
  const currency = activeLocation?.currency_code ?? "ARS";
  const [days, setDays] = useState("90");
  const [issue, setIssue] = useState<"todas" | ReconciliationIssue>("todas");
  const { data, isLoading, error } = useFlowReconciliation(days, activeLocationId);

  const rows = data?.rows ?? [];
  const visible = useMemo(() => rows.filter((r) => issue === "todas" || r.issue === issue), [rows, issue]);
  const counts = useMemo(() => {
    const map = new Map<ReconciliationIssue, number>();
    for (const r of rows) map.set(r.issue, (map.get(r.issue) ?? 0) + 1);
    return map;
  }, [rows]);

  const periodLabel = PERIOD_OPTIONS.find((o) => o.value === days)?.label ?? `Últimos ${days} días`;
  const conciliation = data ? data.movementsCount - rows.filter((r) => r.issue !== "huerfano").length : 0;
  const rate = data && data.movementsCount > 0 ? Math.round((conciliation / data.movementsCount) * 100) : 100;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Conciliación del flujo de fondos</h2>
          <p className="text-xs text-muted-foreground">
            Cruce entre movimientos de fondos (cobros, tickets de caja y minutas) y los asientos posteados del período.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodSelect value={days} onChange={setDays} />
          <ExportMenu
            filename={`conciliacion-flujo-${days}d`}
            title="Conciliación del flujo de fondos"
            subtitle={`${periodLabel} · ${issue === "todas" ? "Todas las discrepancias" : ISSUE_LABEL[issue]}${
              activeLocation?.name ? ` · ${activeLocation.name}` : ""
            }`}
            headers={["Fecha", "Origen", "Referencia", "Movimiento", "Asiento", "Diferencia", "Moneda", "Discrepancia"]}
            rightAlign={["Movimiento", "Asiento", "Diferencia"]}
            disabled={isLoading}
            getRows={() =>
              visible.map((r) => ({
                Fecha: r.date,
                Origen: r.origin,
                Referencia: r.reference,
                Movimiento: r.movement.toFixed(2),
                Asiento: r.posted.toFixed(2),
                Diferencia: r.diff.toFixed(2),
                Moneda: r.currency,
                Discrepancia: ISSUE_LABEL[r.issue],
              }))
            }
          />
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">
          No pudimos calcular la conciliación: {(error as Error).message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Movimientos analizados" value={String(data?.movementsCount ?? 0)} icon={ScaleIcon} />
        <StatCard label="Asientos vinculados" value={String(data?.entriesCount ?? 0)} />
        <StatCard
          label="Discrepancias"
          value={String(rows.length)}
          icon={rows.length > 0 ? TriangleAlert : CheckCircle2}
          tone={rows.length > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Nivel de conciliación"
          value={`${rate}%`}
          hint={`Diferencia neta ${formatMoney(data?.totalDiff ?? 0, currency)}`}
          tone={rate >= 98 ? "success" : rate >= 90 ? "warning" : "danger"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Tipo:</span>
        <Button size="sm" variant={issue === "todas" ? "default" : "outline"} onClick={() => setIssue("todas")}>
          Todas ({rows.length})
        </Button>
        {ISSUES.map((k) => (
          <Button key={k} size="sm" variant={issue === k ? "default" : "outline"} onClick={() => setIssue(k)}>
            {ISSUE_LABEL[k]} ({counts.get(k) ?? 0})
          </Button>
        ))}
      </div>

      {issue !== "todas" && <p className="text-xs text-muted-foreground">{ISSUE_HINT[issue]}</p>}

      <div className="surface-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead className="text-right">Movimiento</TableHead>
              <TableHead className="text-right">Asiento</TableHead>
              <TableHead className="text-right">Diferencia</TableHead>
              <TableHead>Discrepancia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" /> Conciliando movimientos con asientos…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && visible.length === 0 && (
              <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                Todo conciliado: no hay diferencias entre fondos y asientos en el período.
              </TableCell>
            )}
            {visible.slice(0, 300).map((r) => (
              <TableRow key={r.key}>
                <TableCell className="text-xs text-muted-foreground">{r.date}</TableCell>
                <TableCell className="font-medium">{r.origin}</TableCell>
                <TableCell className="max-w-[280px] truncate text-sm">{r.reference}</TableCell>
                <TableCell className="text-right">{formatMoney(r.movement, r.currency)}</TableCell>
                <TableCell className="text-right">{formatMoney(r.posted, r.currency)}</TableCell>
                <TableCell
                  className={`text-right font-medium ${Math.abs(r.diff) > 0.01 ? "text-destructive" : ""}`}
                >
                  {formatMoney(r.diff, r.currency)}
                </TableCell>
                <TableCell>
                  <Badge variant={r.issue === "importe" ? "destructive" : "secondary"}>{ISSUE_LABEL[r.issue]}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
