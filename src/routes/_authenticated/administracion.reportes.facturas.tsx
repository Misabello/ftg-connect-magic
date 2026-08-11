import { createFileRoute } from "@tanstack/react-router";

import { InvoiceAutomation } from "@/components/ftg/invoices/InvoiceAutomation";

export const Route = createFileRoute("/_authenticated/administracion/reportes/facturas")({
  component: () => <InvoiceAutomation />,
});
