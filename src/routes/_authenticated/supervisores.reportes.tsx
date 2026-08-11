import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Loading, Panel } from "@/components/ftg/supervision/SupervisionShell";
import { useScope } from "@/hooks/useScope";
import { useSupervision } from "@/hooks/useSupervision";
import { formatMoney } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/supervisores/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes — Supervisores FTG ONE" },
      { name: "description", content: "Exportá el detalle operativo y comercial del parque en CSV." },
      { property: "og:title", content: "Reportes — Supervisores FTG ONE" },
      { property: "og:description", content: "Exportación de datos de supervisión." },
    ],
  }),
  component: Reportes,
});

function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function Reportes() {
  const { activeLocationId, activeLocation } = useScope();
  const { data, isLoading } = useSupervision(activeLocationId);
  if (isLoading || !data) return <Loading />;
  const currency = activeLocation?.currency_code ?? "ARS";

  const reports = [
    {
      title: "Ventas del día",
      hint: `${data.sales.length} operaciones registradas`,
      run: () =>
        downloadCsv(`ventas-${data.day}`, [
          ["Punto de venta", "Estado", "Origen", "Total", "Fecha"],
          ...data.sales.map((s) => [
            data.pos.find((p) => p.id === s.point_of_sale_id)?.name ?? "",
            s.status,
            s.source,
            Number(s.total ?? 0),
            s.created_at,
          ]),
        ]),
    },
    {
      title: "Tickets y comprobantes",
      hint: `${data.tickets.length} tickets cargados hoy`,
      run: () =>
        downloadCsv(`tickets-${data.day}`, [
          ["Tipo", "Proveedor", "Importe", "Impuesto", "Estado", "Fecha"],
          ...data.tickets.map((t: any) => [t.kind, t.supplier_name ?? "", Number(t.amount ?? 0), Number(t.tax_amount ?? 0), t.status, t.issued_on]),
        ]),
    },
    {
      title: "Inventario",
      hint: `${data.stock.length} productos con stock`,
      run: () =>
        downloadCsv(`inventario-${data.day}`, [
          ["Producto", "Disponible", "Reservado", "Dañado", "Mínimo"],
          ...data.stock.map((s) => [
            data.products.find((p) => p.id === s.product_id)?.name ?? "",
            Number(s.quantity ?? 0),
            Number(s.reserved_quantity ?? 0),
            Number(s.damaged_quantity ?? 0),
            Number(s.min_quantity ?? 0),
          ]),
        ]),
    },
    {
      title: "Incidentes",
      hint: `${data.incidents.length} registros`,
      run: () =>
        downloadCsv(`incidentes-${data.day}`, [
          ["Título", "Categoría", "Severidad", "Estado", "Fecha"],
          ...data.incidents.map((i) => [i.title, i.category, i.severity, i.status, i.created_at]),
        ]),
    },
  ];

  const total = data.sales.filter((s) => s.status === "completada").reduce((a, s) => a + Number(s.total ?? 0), 0);

  return (
    <Panel title="Exportaciones" hint={`Jornada ${data.day} · facturado ${formatMoney(total, currency)}`}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {reports.map((r) => (
          <li key={r.title} className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">{r.title}</p>
              <p className="text-xs text-muted-foreground">{r.hint}</p>
            </div>
            <Button size="sm" variant="outline" onClick={r.run}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
