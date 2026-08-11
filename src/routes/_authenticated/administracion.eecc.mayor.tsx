import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { PeriodSelect } from "@/components/ftg/admin/PeriodSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useScope } from "@/hooks/useScope";
import { accountBalances, useLedgerLines } from "@/lib/ftg/eecc";
import { formatMoney } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/administracion/eecc/mayor")({
  component: LibroMayor,
});

function LibroMayor() {
  const [days, setDays] = useState("90");
  const [account, setAccount] = useState<string>("");
  const { activeLocation, activeLocationId } = useScope();
  const currency = activeLocation?.currency_code ?? "ARS";
  const { data, isLoading } = useLedgerLines(days, activeLocationId);
  const accounts = accountBalances(data ?? []);
  const selected = account || accounts[0]?.code || "";

  const movements = useMemo(() => {
    const lines = (data ?? []).filter((l) => l.account?.code === selected);
    lines.sort((a, b) => (a.entry?.entry_date ?? "").localeCompare(b.entry?.entry_date ?? ""));
    let running = 0;
    return lines.map((l) => {
      running += l.debit - l.credit;
      return { line: l, running };
    });
  }, [data, selected]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Libro mayor</h2>
          <p className="text-xs text-muted-foreground">Movimientos y saldo acumulado por cuenta.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={selected} onValueChange={setAccount}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Elegí una cuenta" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.code} value={a.code}>
                  {a.code} · {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PeriodSelect value={days} onChange={setDays} />
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Detalle</TableHead>
              <TableHead className="text-right">Debe</TableHead>
              <TableHead className="text-right">Haber</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  {isLoading ? "Cargando…" : "Sin movimientos para la cuenta seleccionada."}
                </TableCell>
              </TableRow>
            )}
            {movements.map(({ line, running }) => (
              <TableRow key={line.id}>
                <TableCell className="text-sm">{line.entry?.entry_date}</TableCell>
                <TableCell className="text-sm">{line.description ?? line.entry?.description}</TableCell>
                <TableCell className="text-right">{line.debit ? formatMoney(line.debit, currency) : "—"}</TableCell>
                <TableCell className="text-right">{line.credit ? formatMoney(line.credit, currency) : "—"}</TableCell>
                <TableCell className="text-right font-medium">{formatMoney(running, currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
