import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { PeriodSelect } from "@/components/ftg/admin/PeriodSelect";
import { StatCard } from "@/components/ftg/StatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useScope } from "@/hooks/useScope";
import { accountBalances, useLedgerLines } from "@/lib/ftg/eecc";
import { formatMoney } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/administracion/eecc/situacion")({
  component: Situacion,
});

const SECTIONS = [
  { key: "activo", label: "Activo" },
  { key: "pasivo", label: "Pasivo" },
  { key: "patrimonio", label: "Patrimonio neto" },
];

function Situacion() {
  const [days, setDays] = useState("365");
  const { activeLocation, activeLocationId } = useScope();
  const currency = activeLocation?.currency_code ?? "ARS";
  const { data, isLoading } = useLedgerLines(days, activeLocationId);
  const rows = accountBalances(data ?? []);
  const totalBy = (key: string) => rows.filter((r) => r.type === key).reduce((a, r) => a + r.balance, 0);
  const activo = totalBy("activo");
  const pasivo = totalBy("pasivo");
  const patrimonio = totalBy("patrimonio") + (activo - pasivo - totalBy("patrimonio"));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Estado de situación patrimonial</h2>
          <p className="text-xs text-muted-foreground">Activo, pasivo y patrimonio neto acumulados.</p>
        </div>
        <PeriodSelect value={days} onChange={setDays} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Activo" value={formatMoney(activo, currency)} tone="success" />
        <StatCard label="Pasivo" value={formatMoney(pasivo, currency)} tone="warning" />
        <StatCard label="Patrimonio neto" value={formatMoney(patrimonio, currency)} />
      </div>

      {SECTIONS.map((section) => {
        const items = rows.filter((r) => r.type === section.key);
        return (
          <div key={section.key} className="surface-card overflow-hidden">
            <h3 className="px-5 pt-4 text-sm font-semibold">{section.label}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuenta</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="py-6 text-center text-sm text-muted-foreground">
                      {isLoading ? "Cargando…" : "Sin cuentas con movimientos."}
                    </TableCell>
                  </TableRow>
                )}
                {items.map((r) => (
                  <TableRow key={r.code}>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{r.code}</span> {r.name}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(r.balance, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      })}
    </section>
  );
}
