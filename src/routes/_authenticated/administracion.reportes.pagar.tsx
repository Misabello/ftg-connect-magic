import { createFileRoute } from "@tanstack/react-router";

import { FinanceDocsReport } from "@/components/ftg/admin/FinanceDocsReport";

export const Route = createFileRoute("/_authenticated/administracion/reportes/pagar")({
  component: () => <FinanceDocsReport kind="pagar" />,
});
