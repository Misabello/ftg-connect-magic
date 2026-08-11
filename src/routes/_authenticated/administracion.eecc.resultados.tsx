import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { PeriodSelect } from "@/components/ftg/admin/PeriodSelect";
import { StatCard } from "@/components/ftg/StatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useScope } from "@/hooks/useScope";
import { accountBalances, useLedgerLines } from "@/lib/ftg/eecc";
import { formatMoney } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/administracion/eecc/resultados")({
  component: Resultados,
});

function Resultados() {
  const [days, setDays] = useState("90");
  const { activeLocation, activeLocationId } = useScope();
  const currency = activeLocation?.currency_code ?? "ARS";
  const { data, isLoading } = useLedgerLines(days, activeLocationId);
  const rows = accountBalances(data ?? []);
  const income = rows.filter((r) => r.type === "ingreso");
  const expense = rows.filter((r) => ["egreso", "gasto", "costo"].includes(r.type));
  const totalIncome = income.reduce((a, r) => a + r.balance, 0);
  const totalExpense = expense.reduce((a, r) => a + r.balance, 0);
  const result = totalIncome - totalExpense;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Estado de resultados</h2>
          <p className="text-xs text-muted-foreground">Ingresos menos costos y gastos del período.</p>
        </div>
        <PeriodSelect value={days} onChange={setDays} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Ingresos" value={formatMoney(totalIncome, currency)} tone="success" />
        <StatCard label="Costos y gastos" value={formatMoney(totalExpense, currency)} tone="warning" />
        <StatCard label="Resultado del período" value={formatMoney(result, currency)} tone={result >= 0 ? "success" : "danger"} />
      </div>

      <div className="surface-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cuenta</TableHead>
              <TableHead>Sección</TableHead>
              <TableHead className="text-right">Importe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {income.length + expense.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                  {isLoading ? "Cargando asientos…" : "Sin movimientos de resultado en el período."}
                </TableCell>
              </TableRow>
            )}
            {[...income, ...expense].map((r) => (
              <TableRow key={r.code}>
                <TableCell>
                  <span className="font-mono text-xs text-muted-foreground">{r.code}</span> {r.name}
                </TableCell>
                <TableCell className="text-xs capitalize text-muted-foreground">{r.type}</TableCell>
                <TableCell className="text-right font-medium">{formatMoney(r.balance, currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
