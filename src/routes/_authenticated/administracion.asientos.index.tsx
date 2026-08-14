import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { ExportMenu } from "@/components/ftg/admin/ExportMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/administracion/asientos/")({
  head: () => ({
    meta: [
      { title: "Asientos contables — FTG ONE" },
      { name: "description", content: "Últimos asientos contables, incluidos los cierres de caja de cada puesto." },
      { property: "og:title", content: "Asientos contables — FTG ONE" },
      { property: "og:description", content: "Libro de asientos: manuales, ventas, tickets y cierres de caja." },
    ],
  }),
  component: AsientosIndex,
});

const HEADERS = ["Fecha", "Descripción", "Origen", "Moneda", "Debe", "Haber"];

const SOURCE_LABEL: Record<string, string> = {
  manual: "Manual",
  sale: "Venta",
  sale_payment: "Cobro",
  pos_ticket: "Ticket de caja",
  cash_session_close: "Cierre de caja",
  cierre_caja: "Cierre de caja",
  treasury_memo: "Minuta",
};

function AsientosIndex() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["journal-entries-latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("id, entry_date, description, source_type, currency_code, created_at, journal_lines(debit, credit)")
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = entries.map((e) => {
    const debit = (e.journal_lines ?? []).reduce((acc, l) => acc + Number(l.debit ?? 0), 0);
    const credit = (e.journal_lines ?? []).reduce((acc, l) => acc + Number(l.credit ?? 0), 0);
    return {
      Fecha: e.entry_date,
      Descripción: e.description ?? "",
      Origen: SOURCE_LABEL[e.source_type ?? "manual"] ?? e.source_type ?? "Manual",
      Moneda: e.currency_code ?? "ARS",
      Debe: debit,
      Haber: credit,
    };
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Últimos 30 asientos del libro diario, incluidos los cierres de caja de cada punto de venta.
        </p>
        <div className="flex items-center gap-2">
            <ExportMenu
              filename="ftg-asientos-contables"
              title="Asientos contables"
              subtitle="Últimos 30 asientos"
              headers={HEADERS}
              rightAlign={["Debe", "Haber"]}
              getRows={() => rows}
            />
            <Button asChild size="sm">
              <Link to="/administracion/asientos/nuevo">
                <Plus className="mr-1.5 h-4 w-4" /> Crear asiento
              </Link>
            </Button>
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {HEADERS.map((h) => (
                <TableHead key={h} className={h === "Debe" || h === "Haber" ? "text-right" : undefined}>
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={HEADERS.length} className="py-10 text-center text-sm text-muted-foreground">
                  Cargando asientos…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={HEADERS.length} className="py-10 text-center text-sm text-muted-foreground">
                  Todavía no hay asientos registrados.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r, i) => (
              <TableRow key={`${r.Fecha}-${i}`}>
                <TableCell>{r.Fecha}</TableCell>
                <TableCell className="max-w-[380px] truncate">{r.Descripción}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{r.Origen}</Badge>
                </TableCell>
                <TableCell>{r.Moneda}</TableCell>
                <TableCell className="text-right">{formatMoney(r.Debe, r.Moneda)}</TableCell>
                <TableCell className="text-right">{formatMoney(r.Haber, r.Moneda)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}