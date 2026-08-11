import { createFileRoute } from "@tanstack/react-router";

import { FinanceDocsPanel } from "@/components/ftg/admin/FinanceDocsPanel";

export const Route = createFileRoute("/_authenticated/administracion/pagar")({
  component: () => <FinanceDocsPanel kind="pagar" />,
});
