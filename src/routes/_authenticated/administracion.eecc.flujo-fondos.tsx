import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { PeriodSelect } from "@/components/ftg/admin/PeriodSelect";
import { StatCard } from "@/components/ftg/StatCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useScope } from "@/hooks/useScope";
import { supabase } from "@/integrations/supabase/client";
import { periodStart } from "@/lib/ftg/eecc";
import { formatMoney } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/administracion/eecc/flujo-fondos")({
  component: FlujoDeFondos,
});

type FlowRow = { bucket: string; source_name: string; currency_code: string; inflow: number; outflow: number };

function FlujoDeFondos() {
  const { activeLocation, activeLocationId } = useScope();
  const currency = activeLocation?.currency_code ?? "ARS";
  const [days, setDays] = useState("90");
  const [bucket, setBucket] = useState<"week" | "month">("month");

  const from = periodStart(days);
  const to = new Date().toISOString().slice(0, 10);

  const { data, isLoading, error } = useQuery({
    queryKey: ["flujo-fondos", days, bucket, activeLocationId],
    queryFn: async () => {
      const [flow, opening] = await Promise.all([
        supabase.rpc("cash_flow_summary", { _from: from, _to: to, _loc: activeLocationId ?? undefined, _bucket: bucket }),
        supabase.rpc("cash_flow_opening", { _from: from, _loc: activeLocationId ?? undefined }),
      ]);
      if (flow.error) throw flow.error;
      return {
        rows: ((flow.data ?? []) as FlowRow[]).map((r) => ({
          ...r,
          inflow: Number(r.inflow),
          outflow: Number(r.outflow),
        })),
        opening: Number(opening.data ?? 0),
      };
    },
  });

  const rows = data?.rows ?? [];

  const byPeriod = useMemo(() => {
    const map = new Map<string, { bucket: string; inflow: number; outflow: number }>();
    for (const r of rows) {
      const current = map.get(r.bucket) ?? { bucket: r.bucket, inflow: 0, outflow: 0 };
      current.inflow += r.inflow;
      current.outflow += r.outflow;
      map.set(r.bucket, current);
    }
    let running = data?.opening ?? 0;
    return [...map.values()]
      .sort((a, b) => a.bucket.localeCompare(b.bucket))
      .map((p) => {
        const open = running;
        running = open + p.inflow - p.outflow;
        return { ...p, open, close: running };
      });
  }, [rows, data?.opening]);

  const bySource = useMemo(() => {
    const map = new Map<string, { source: string; inflow: number; outflow: number }>();
    for (const r of rows) {
      const current = map.get(r.source_name) ?? { source: r.source_name, inflow: 0, outflow: 0 };
      current.inflow += r.inflow;
      current.outflow += r.outflow;
      map.set(r.source_name, current);
    }
    return [...map.values()].sort((a, b) => b.inflow - b.outflow - (a.inflow - a.outflow));
  }, [rows]);

  const totals = useMemo(
    () => ({
      inflow: rows.reduce((acc, r) => acc + r.inflow, 0),
      outflow: rows.reduce((acc, r) => acc + r.outflow, 0),
    }),
    [rows],
  );
  const opening = data?.opening ?? 0;
  const closing = opening + totals.inflow - totals.outflow;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Flujo de fondos</h2>
          <p className="text-xs text-muted-foreground">
            Ingresos y egresos por período y por medio de cobro/pago, calculados en la base de datos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={bucket} onValueChange={(v) => setBucket(v as typeof bucket)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semanal</SelectItem>
              <SelectItem value="month">Mensual</SelectItem>
            </SelectContent>
          </Select>
          <PeriodSelect value={days} onChange={setDays} />
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">
          No pudimos calcular el flujo de fondos: {(error as Error).message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Saldo inicial" value={formatMoney(opening, currency)} icon={Wallet} />
        <StatCard label="Ingresos" value={formatMoney(totals.inflow, currency)} icon={TrendingUp} tone="success" />
        <StatCard label="Egresos" value={formatMoney(totals.outflow, currency)} icon={TrendingDown} tone="warning" />
        <StatCard label="Saldo final" value={formatMoney(closing, currency)} tone={closing >= 0 ? "success" : "danger"} />
      </div>

      {isLoading && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" /> Calculando flujo de fondos…
        </p>
      )}

      {!isLoading && rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No hay movimientos de fondos en el período seleccionado.
        </p>
      )}

      {!isLoading && rows.length > 0 && (
        <>
          <div className="surface-card overflow-hidden">
            <p className="px-5 pt-4 text-sm font-medium">Evolución por período</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Saldo inicial</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                  <TableHead className="text-right">Egresos</TableHead>
                  <TableHead className="text-right">Saldo final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byPeriod.map((p) => (
                  <TableRow key={p.bucket}>
                    <TableCell className="font-medium">{p.bucket}</TableCell>
                    <TableCell className="text-right">{formatMoney(p.open, currency)}</TableCell>
                    <TableCell className="text-right text-success">{formatMoney(p.inflow, currency)}</TableCell>
                    <TableCell className="text-right text-destructive">{formatMoney(p.outflow, currency)}</TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(p.close, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="surface-card overflow-hidden">
            <p className="px-5 pt-4 text-sm font-medium">Desglose por medio de cobro / pago</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fuente</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                  <TableHead className="text-right">Egresos</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bySource.map((s) => (
                  <TableRow key={s.source}>
                    <TableCell className="font-medium">{s.source}</TableCell>
                    <TableCell className="text-right text-success">{formatMoney(s.inflow, currency)}</TableCell>
                    <TableCell className="text-right text-destructive">{formatMoney(s.outflow, currency)}</TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(s.inflow - s.outflow, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </section>
  );
}
