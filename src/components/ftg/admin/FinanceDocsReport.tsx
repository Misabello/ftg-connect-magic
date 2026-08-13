import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  LocationFilter,
  MAX_REPORT_ROWS,
  PeriodSelect,
  ReportShell,
  SimpleFilter,
} from "@/components/ftg/admin/ReportShell";
import { useScope } from "@/hooks/useScope";
import { supabase } from "@/integrations/supabase/client";
import { periodStart } from "@/lib/ftg/eecc";
import { formatMoney } from "@/lib/ftg/format";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  { value: "pendiente", label: "Pendiente" },
  { value: "parcial", label: "Parcial" },
  { value: "pagado", label: "Pagado" },
  { value: "vencido", label: "Vencido" },
  { value: "anulado", label: "Anulado" },
];

export function FinanceDocsReport({ kind }: { kind: "pagar" | "cobrar" }) {
  const partyLabel = kind === "pagar" ? "Proveedor" : "Cliente";
  const headers = ["Emisión", "Vencimiento", partyLabel, "Comprobante", "Concepto", "Importe", "Saldo", "Estado"];
  const { activeLocationId } = useScope();
  const [days, setDays] = useState("90");
  const [status, setStatus] = useState("all");
  const [locationId, setLocationId] = useState(activeLocationId ?? "all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["report-finance-docs", kind, days, status, locationId],
    queryFn: async () => {
      let q = supabase
        .from("finance_documents")
        .select(
          "id, kind, status, document_number, concept, currency_code, amount, paid_amount, issued_on, due_on, suppliers(name), customers(name)",
        )
        .eq("kind", kind)
        .gte("issued_on", periodStart(days))
        .order("issued_on", { ascending: false })
        .limit(MAX_REPORT_ROWS);
      if (status !== "all") q = q.eq("status", status as never);
      if (locationId !== "all") q = q.eq("location_id", locationId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = useMemo(
    () =>
      (data ?? []).map((d) => {
        const cur = d.currency_code ?? "ARS";
        const amount = Number(d.amount ?? 0);
        const paid = Number(d.paid_amount ?? 0);
        return {
          Emisión: d.issued_on ? new Date(d.issued_on).toLocaleDateString("es-AR") : "—",
          Vencimiento: d.due_on ? new Date(d.due_on).toLocaleDateString("es-AR") : "—",
          [partyLabel]: (kind === "pagar" ? d.suppliers?.name : d.customers?.name) ?? "—",
          Comprobante: d.document_number ?? "—",
          Concepto: d.concept ?? "—",
          Importe: formatMoney(amount, cur),
          Saldo: formatMoney(amount - paid, cur),
          Estado: d.status,
        };
      }),
    [data, kind, partyLabel],
  );

  return (
    <ReportShell
      title={kind === "pagar" ? "Cuentas a pagar" : "Cuentas a cobrar"}
      description={`Histórico de documentos a ${kind} por período y estado.`}
      filename={`ftg-reporte-ctas-a-${kind}`}
      headers={headers}
      rightAlign={["Importe", "Saldo"]}
      rows={rows}
      loading={isLoading}
      error={error}
      filters={
        <>
          <PeriodSelect value={days} onChange={setDays} />
          <SimpleFilter value={status} onChange={setStatus} options={STATUS_OPTIONS} placeholder="Estado" />
          <LocationFilter value={locationId} onChange={setLocationId} />
        </>
      }
    />
  );
}
