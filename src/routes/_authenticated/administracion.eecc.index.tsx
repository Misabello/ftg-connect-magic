import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { PeriodSelect } from "@/components/ftg/admin/PeriodSelect";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useScope } from "@/hooks/useScope";
import { accountBalances, useLedgerLines } from "@/lib/ftg/eecc";
import { formatMoney } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/administracion/eecc/")({
  component: SumasYSaldos,
});

function SumasYSaldos() {
  const [days, setDays] = useState("90");
  const { activeLocation, activeLocationId } = useScope();
  const currency = activeLocation?.currency_code ?? "ARS";
  const { data, isLoading } = useLedgerLines(days, activeLocationId);
  const rows = accountBalances(data ?? []);
  const totalDebit = rows.reduce((a, r) => a + r.debit, 0);
  const totalCredit = rows.reduce((a, r) => a + r.credit, 0);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Balance de sumas y saldos</h2>
          <p className="text-xs text-muted-foreground">Partida doble sobre los asientos del período.</p>
        </div>
        <PeriodSelect value={days} onChange={setDays} />
      </div>

      <div className="surface-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cuenta</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Debe</TableHead>
              <TableHead className="text-right">Haber</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  {isLoading ? "Cargando asientos…" : "No hay movimientos contables en el período."}
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.code}>
                <TableCell>
                  <span className="font-mono text-xs text-muted-foreground">{r.code}</span> {r.name}
                </TableCell>
                <TableCell className="text-xs capitalize text-muted-foreground">{r.type}</TableCell>
                <TableCell className="text-right">{formatMoney(r.debit, currency)}</TableCell>
                <TableCell className="text-right">{formatMoney(r.credit, currency)}</TableCell>
                <TableCell className="text-right font-medium">{formatMoney(r.balance, currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2}>Totales</TableCell>
                <TableCell className="text-right">{formatMoney(totalDebit, currency)}</TableCell>
                <TableCell className="text-right">{formatMoney(totalCredit, currency)}</TableCell>
                <TableCell className="text-right">
                  {Math.abs(totalDebit - totalCredit) < 0.01 ? "Balanceado" : formatMoney(totalDebit - totalCredit, currency)}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </section>
  );
}
