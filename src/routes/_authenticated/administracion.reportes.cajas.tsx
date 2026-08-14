import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { LocationFilter, MAX_REPORT_ROWS, PeriodSelect, ReportShell } from "@/components/ftg/admin/ReportShell";
import { useScope } from "@/hooks/useScope";
import { supabase } from "@/integrations/supabase/client";
import { periodStart } from "@/lib/ftg/eecc";
import { formatMoney } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/administracion/reportes/cajas")({
  component: CajasReport,
});

const HEADERS = ["Punto de venta", "Apertura", "Cierre", "Inicial", "Esperado", "Contado", "Diferencia", "Estado"];

const STATUS_LABELS: Record<string, string> = { abierta: "Abierta", cerrada: "Cerrada", arqueada: "Arqueada" };

function CajasReport() {
  const { activeLocationId } = useScope();
  const [days, setDays] = useState("30");
  const [locationId, setLocationId] = useState(activeLocationId ?? "all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["report-cash-sessions", days, locationId],
    queryFn: async () => {
      let q = supabase
        .from("cash_sessions")
        .select(
          "id, status, currency_code, opening_amount, expected_amount, counted_amount, difference_amount, opened_at, closed_at, points_of_sale(name)",
        )
        .gte("opened_at", periodStart(days))
        .order("opened_at", { ascending: false })
        .limit(MAX_REPORT_ROWS);
      if (locationId !== "all") q = q.eq("location_id", locationId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = useMemo(
    () =>
      (data ?? []).map((s) => {
        const cur = s.currency_code ?? "ARS";
        return {
          "Punto de venta": s.points_of_sale?.name ?? "—",
          Apertura: new Date(s.opened_at).toLocaleString("es-AR"),
          Cierre: s.closed_at ? new Date(s.closed_at).toLocaleString("es-AR") : "Turno abierto",
          Inicial: formatMoney(Number(s.opening_amount ?? 0), cur),
          Esperado: formatMoney(Number(s.expected_amount ?? 0), cur),
          Contado: formatMoney(Number(s.counted_amount ?? 0), cur),
          Diferencia: formatMoney(Number(s.difference_amount ?? 0), cur),
          Estado: STATUS_LABELS[s.status] ?? s.status,
        };
      }),
    [data],
  );

  return (
    <ReportShell
      title="Cajas y arqueos"
      description="Turnos de caja, montos esperados y diferencias por período."
      filename="ftg-reporte-cajas"
      headers={HEADERS}
      rightAlign={["Inicial", "Esperado", "Contado", "Diferencia"]}
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
