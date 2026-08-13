import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { LocationFilter, MAX_REPORT_ROWS, PeriodSelect, ReportShell, SimpleFilter } from "@/components/ftg/admin/ReportShell";
import { useScope } from "@/hooks/useScope";
import { supabase } from "@/integrations/supabase/client";
import { periodStart } from "@/lib/ftg/eecc";

export const Route = createFileRoute("/_authenticated/administracion/reportes/inventario")({
  component: StockReport,
});

const HEADERS = ["Fecha", "Sede", "Producto", "Movimiento", "Cantidad", "Motivo", "Referencia"];

const KINDS = [
  { value: "all", label: "Todos los movimientos" },
  { value: "recepcion", label: "Recepción" },
  { value: "ajuste", label: "Ajuste" },
  { value: "transferencia", label: "Transferencia" },
  { value: "venta", label: "Venta" },
  { value: "merma", label: "Merma" },
  { value: "devolucion", label: "Devolución" },
];

function StockReport() {
  const { activeLocationId } = useScope();
  const [days, setDays] = useState("30");
  const [kind, setKind] = useState("all");
  const [locationId, setLocationId] = useState(activeLocationId ?? "all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["report-stock-movements", days, kind, locationId],
    queryFn: async () => {
      let q = supabase
        .from("stock_movements")
        .select("id, created_at, kind, quantity, reason, reference, products(name, sku), locations(name)")
        .gte("created_at", periodStart(days))
        .order("created_at", { ascending: false })
        .limit(MAX_REPORT_ROWS);
      if (kind !== "all") q = q.eq("kind", kind as never);
      if (locationId !== "all") q = q.eq("location_id", locationId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = useMemo(
    () =>
      (data ?? []).map((m) => ({
        Fecha: new Date(m.created_at).toLocaleString("es-AR"),
        Sede: m.locations?.name ?? "—",
        Producto: m.products?.name ?? "—",
        Movimiento: m.kind,
        Cantidad: Number(m.quantity ?? 0),
        Motivo: m.reason ?? "—",
        Referencia: m.reference ?? "—",
      })),
    [data],
  );

  return (
    <ReportShell
      title="Inventario y movimientos de stock"
      description="Histórico de movimientos por período, sede y tipo."
      filename="ftg-reporte-inventario"
      headers={HEADERS}
      rightAlign={["Cantidad"]}
      rows={rows}
      loading={isLoading}
      error={error}
      filters={
        <>
          <PeriodSelect value={days} onChange={setDays} />
          <SimpleFilter value={kind} onChange={setKind} options={KINDS} placeholder="Movimiento" />
          <LocationFilter value={locationId} onChange={setLocationId} />
        </>
      }
    />
  );
}
