import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/ftg/format";
import { balanceOf } from "@/lib/ftg/finance";
import { useScope } from "@/hooks/useScope";

type Period = 30 | 90 | 365;

const PERIODS: { value: Period; label: string }[] = [
  { value: 30, label: "30 días" },
  { value: 90, label: "90 días" },
  { value: 365, label: "12 meses" },
];

export function SedeAccounting() {
  const { locations } = useScope();
  const [period, setPeriod] = useState<Period>(30);
  const since = useMemo(() => new Date(Date.now() - period * 86_400_000).toISOString(), [period]);

  const { data, isLoading } = useQuery({
    queryKey: ["sede-accounting", period],
    queryFn: async () => {
      const [pos, sales, docs, sessions] = await Promise.all([
        supabase.from("points_of_sale").select("id, name, code, pos_type, location_id, currency_code, is_active"),
        supabase
          .from("sales")
          .select("id, total, status, currency_code, location_id, point_of_sale_id, created_at")
          .gte("created_at", since),
        supabase
          .from("finance_documents")
          .select("id, kind, status, amount, paid_amount, currency_code, location_id"),
        supabase
          .from("cash_sessions")
          .select("id, status, difference_amount, currency_code, location_id, point_of_sale_id")
          .gte("opened_at", since),
      ]);
      if (pos.error) throw pos.error;
      return {
        pos: pos.data ?? [],
        sales: sales.data ?? [],
        docs: docs.data ?? [],
        sessions: sessions.data ?? [],
      };
    },
  });

  const summary = useMemo(() => {
    if (!data) return [];
    return locations.map((loc) => {
      const posList = data.pos.filter((p) => p.location_id === loc.id);
      const locSales = data.sales.filter((s) => s.location_id === loc.id && s.status === "completada");
      const locDocs = data.docs.filter((d) => d.location_id === loc.id && d.status !== "anulado" && d.status !== "pagado");
      const receivable = locDocs
        .filter((d) => d.kind === "cobrar")
        .reduce((a, d) => a + balanceOf({ amount: Number(d.amount), paid_amount: Number(d.paid_amount) }), 0);
      const payable = locDocs
        .filter((d) => d.kind === "pagar")
        .reduce((a, d) => a + balanceOf({ amount: Number(d.amount), paid_amount: Number(d.paid_amount) }), 0);
      const diff = data.sessions
        .filter((s) => s.location_id === loc.id)
        .reduce((a, s) => a + Number(s.difference_amount ?? 0), 0);
      const revenue = locSales.reduce((a, s) => a + Number(s.total), 0);

      const rows = posList.map((p) => {
        const psales = locSales.filter((s) => s.point_of_sale_id === p.id);
        const total = psales.reduce((a, s) => a + Number(s.total), 0);
        const openSessions = data.sessions.filter((s) => s.point_of_sale_id === p.id && s.status === "abierta").length;
        const pdiff = data.sessions
          .filter((s) => s.point_of_sale_id === p.id)
          .reduce((a, s) => a + Number(s.difference_amount ?? 0), 0);
        return {
          id: p.id,
          name: p.name,
          code: p.code,
          type: p.pos_type,
          active: p.is_active,
          tickets: psales.length,
          total,
          average: psales.length > 0 ? total / psales.length : 0,
          openSessions,
          diff: pdiff,
        };
      });
      rows.sort((a, b) => b.total - a.total);

      return {
        id: loc.id,
        name: loc.name,
        code: loc.code,
        currency: loc.currency_code,
        revenue,
        tickets: locSales.length,
        receivable,
        payable,
        result: revenue + receivable - payable,
        diff,
        rows,
      };
    });
  }, [data, locations]);

  const grand = useMemo(
    () => summary.reduce((a, s) => a + s.revenue, 0),
    [summary],
  );
  const fallbackCurrency = locations[0]?.currency_code ?? "ARS";

  return (
    <section className="surface-card p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Contabilidad por sede y punto de venta</h2>
          <p className="text-sm text-muted-foreground">
            Ventas, cuentas y arqueos consolidados por cada sede, con desglose por caja.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-surface p-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriod(p.value)}
                className={
                  "rounded-md px-3 py-1 text-xs font-medium transition " +
                  (period === p.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")
                }
              >
                {p.label}
              </button>
            ))}
          </div>
          <Badge variant="secondary">Total {formatMoney(grand, fallbackCurrency)}</Badge>
        </div>
      </header>

      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Calculando…</p>}

      {!isLoading && summary.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No hay sedes disponibles.
        </p>
      )}

      <Accordion type="multiple" className="mt-4">
        {summary.map((s) => (
          <AccordionItem key={s.id} value={s.id}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex flex-1 flex-wrap items-center justify-between gap-3 pr-3 text-left">
                <span className="flex items-center gap-2 font-medium">
                  <Building2 className="size-4 text-muted-foreground" />
                  {s.name}
                  <span className="font-mono text-xs text-muted-foreground">{s.code}</span>
                </span>
                <span className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    Ventas <strong className="text-foreground">{formatMoney(s.revenue, s.currency)}</strong>
                  </span>
                  <span>
                    Por cobrar <strong className="text-foreground">{formatMoney(s.receivable, s.currency)}</strong>
                  </span>
                  <span>
                    Por pagar <strong className="text-foreground">{formatMoney(s.payable, s.currency)}</strong>
                  </span>
                  <span>
                    Resultado <strong className="text-foreground">{formatMoney(s.result, s.currency)}</strong>
                  </span>
                  {s.diff !== 0 && <Badge variant="destructive">Dif. caja {formatMoney(s.diff, s.currency)}</Badge>}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {s.rows.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                  Esta sede todavía no tiene puntos de venta.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Punto de venta</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Tickets</TableHead>
                      <TableHead className="text-right">Ventas</TableHead>
                      <TableHead className="text-right">Ticket promedio</TableHead>
                      <TableHead className="text-right">Dif. arqueo</TableHead>
                      <TableHead>Cajas abiertas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {s.rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <p className="font-medium">{r.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">{r.code}</p>
                        </TableCell>
                        <TableCell className="text-sm capitalize">{String(r.type).replace("_", " ")}</TableCell>
                        <TableCell className="text-right text-sm">{r.tickets}</TableCell>
                        <TableCell className="text-right font-medium">{formatMoney(r.total, s.currency)}</TableCell>
                        <TableCell className="text-right text-sm">{formatMoney(r.average, s.currency)}</TableCell>
                        <TableCell className="text-right text-sm">
                          <span className={r.diff !== 0 ? "text-destructive" : "text-muted-foreground"}>
                            {formatMoney(r.diff, s.currency)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {r.openSessions > 0 ? (
                            <Badge variant="secondary">{r.openSessions} abierta(s)</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
