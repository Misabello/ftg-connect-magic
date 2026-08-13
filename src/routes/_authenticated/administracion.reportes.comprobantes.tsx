import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { MAX_REPORT_ROWS, PeriodSelect, ReportShell, SimpleFilter } from "@/components/ftg/admin/ReportShell";
import { supabase } from "@/integrations/supabase/client";
import { periodStart } from "@/lib/ftg/eecc";
import { formatMoney } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/administracion/reportes/comprobantes")({
  component: InvoicesReport,
});

const HEADERS = ["Fecha", "Dirección", "Emisor", "Número", "Tipo", "Importe", "Estado"];

const DIRECTIONS = [
  { value: "all", label: "Todas las direcciones" },
  { value: "proveedor", label: "De proveedores" },
  { value: "cliente", label: "A clientes" },
];

function InvoicesReport() {
  const [days, setDays] = useState("90");
  const [direction, setDirection] = useState("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["report-invoice-docs", days, direction],
    queryFn: async () => {
      let q = supabase
        .from("invoice_documents")
        .select(
          "id, created_at, issue_date, document_direction, document_type, issuer_name, document_number, currency_code, total_amount, approval_status",
        )
        .gte("created_at", periodStart(days))
        .order("created_at", { ascending: false })
        .limit(MAX_REPORT_ROWS);
      if (direction !== "all") q = q.eq("document_direction", direction as never);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = useMemo(
    () =>
      (data ?? []).map((d) => ({
        Fecha: new Date(d.issue_date ?? d.created_at).toLocaleDateString("es-AR"),
        Dirección: d.document_direction === "cliente" ? "Cliente" : "Proveedor",
        Emisor: d.issuer_name ?? "—",
        Número: d.document_number ?? "—",
        Tipo: (d.document_type ?? "—").replaceAll("_", " "),
        Importe: formatMoney(Number(d.total_amount ?? 0), d.currency_code ?? "ARS"),
        Estado: (d.approval_status ?? "—").replaceAll("_", " "),
      })),
    [data],
  );

  return (
    <ReportShell
      title="Facturas procesadas"
      description="Histórico de comprobantes digitalizados por período y dirección."
      filename="ftg-reporte-facturas"
      headers={HEADERS}
      rightAlign={["Importe"]}
      rows={rows}
      loading={isLoading}
      error={error}
      filters={
        <>
          <PeriodSelect value={days} onChange={setDays} />
          <SimpleFilter value={direction} onChange={setDirection} options={DIRECTIONS} placeholder="Dirección" />
        </>
      }
    />
  );
}
