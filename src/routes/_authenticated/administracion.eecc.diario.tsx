import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { PeriodSelect } from "@/components/ftg/admin/PeriodSelect";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useScope } from "@/hooks/useScope";
import { useLedgerLines, type LedgerLine } from "@/lib/ftg/eecc";
import { formatMoney } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/administracion/eecc/diario")({
  component: LibroDiario,
});

function LibroDiario() {
  const [days, setDays] = useState("30");
  const [source, setSource] = useState<"todos" | "manual" | "automatico">("todos");
  const { activeLocation, activeLocationId } = useScope();
  const currency = activeLocation?.currency_code ?? "ARS";
  const { data, isLoading } = useLedgerLines(days, activeLocationId);

  const entries = useMemo(() => {
    const map = new Map<string, { id: string; date: string; description: string; source: string; lines: LedgerLine[] }>();
    for (const line of data ?? []) {
      const e = line.entry;
      if (!e) continue;
      const current = map.get(e.id) ?? {
        id: e.id,
        date: e.entry_date,
        description: e.description,
        source: e.source_type,
        lines: [],
      };
      current.lines.push(line);
      map.set(e.id, current);
    }
    return [...map.values()]
      .filter((e) =>
        source === "todos"
          ? true
          : source === "manual"
            ? e.source === "manual" || e.source === "minuta"
            : e.source !== "manual" && e.source !== "minuta",
      )
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 120);
  }, [data, source]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Libro diario</h2>
          <p className="text-xs text-muted-foreground">Asientos cronológicos con sus partidas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={source} onValueChange={(v) => setSource(v as typeof source)}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="manual">Manuales</TabsTrigger>
              <TabsTrigger value="automatico">Automáticos</TabsTrigger>
            </TabsList>
          </Tabs>
          <PeriodSelect value={days} onChange={setDays} />
          <Button asChild size="sm">
            <Link to="/administracion/asientos/nuevo">
              <Plus className="mr-1.5 h-4 w-4" /> Cargar asiento
            </Link>
          </Button>
        </div>
      </div>

      {entries.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {isLoading ? "Cargando asientos…" : "No hay asientos en el período."}
        </p>
      )}

      {entries.map((entry) => (
        <div key={entry.id} className="surface-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4 text-sm">
            <p className="font-medium">{entry.description}</p>
            <p className="text-xs text-muted-foreground">
              {entry.date} · {entry.source === "manual" ? "Asiento manual" : entry.source === "minuta" ? "Minuta" : entry.source}
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cuenta</TableHead>
                <TableHead className="text-right">Debe</TableHead>
                <TableHead className="text-right">Haber</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entry.lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground">{l.account?.code}</span> {l.account?.name}
                  </TableCell>
                  <TableCell className="text-right">{l.debit ? formatMoney(l.debit, currency) : "—"}</TableCell>
                  <TableCell className="text-right">{l.credit ? formatMoney(l.credit, currency) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </section>
  );
}
