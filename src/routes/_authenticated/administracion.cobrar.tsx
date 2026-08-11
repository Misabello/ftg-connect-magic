import { createFileRoute } from "@tanstack/react-router";

import { FinanceDocsPanel } from "@/components/ftg/admin/FinanceDocsPanel";

export const Route = createFileRoute("/_authenticated/administracion/cobrar")({
  component: () => <FinanceDocsPanel kind="cobrar" />,
});
