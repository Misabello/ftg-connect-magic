import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { LocationFilter, MAX_REPORT_ROWS, PeriodSelect, ReportShell } from "@/components/ftg/admin/ReportShell";
import { useScope } from "@/hooks/useScope";
import { supabase } from "@/integrations/supabase/client";
import { periodStart } from "@/lib/ftg/eecc";
import { formatMoney } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/administracion/reportes/ventas")({
  component: SalesReport,
});

const HEADERS = ["Fecha", "Comprobante", "Sede", "Punto de venta", "Medio de pago", "Total", "Estado"];

function SalesReport() {
  const { activeLocationId } = useScope();
  const [days, setDays] = useState("30");
  const [locationId, setLocationId] = useState(activeLocationId ?? "all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["report-sales", days, locationId],
    queryFn: async () => {
      let q = supabase
        .from("sales")
        .select(
          "id, created_at, sale_number, total, currency_code, status, locations(name), points_of_sale(name), sale_payments(method_name)",
        )
        .gte("created_at", periodStart(days))
        .order("created_at", { ascending: false })
        .limit(MAX_REPORT_ROWS);
      if (locationId !== "all") q = q.eq("location_id", locationId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = useMemo(
    () =>
      (data ?? []).map((s) => ({
        Fecha: new Date(s.created_at).toLocaleDateString("es-AR"),
        Comprobante: s.sale_number ?? "—",
        Sede: s.locations?.name ?? "—",
        "Punto de venta": s.points_of_sale?.name ?? "—",
        "Medio de pago":
          (s.sale_payments ?? []).map((p) => p.method_name).filter(Boolean).join(", ") || "—",
        Total: formatMoney(Number(s.total ?? 0), s.currency_code ?? "ARS"),
        Estado: s.status === "anulada" ? "Anulada" : "Completada",
      })),
    [data],
  );

  return (
    <ReportShell
      title="Reporte de ventas"
      description="Histórico de ventas por período y punto de venta."
      filename="ftg-reporte-ventas"
      headers={HEADERS}
      rightAlign={["Total"]}
      rows={rows}
      loading={isLoading}
      error={error}
      filters={
        <>
          <PeriodSelect value={days} onChange={setDays} />
          <LocationFilter value={locationId} onChange={setLocationId} />
        </>
      }
    />
  );
}
