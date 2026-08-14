import { createFileRoute } from "@tanstack/react-router";

import { SedeAccounting } from "@/components/ftg/SedeAccounting";

export const Route = createFileRoute("/_authenticated/administracion/reportes/")({
  component: () => <SedeAccounting />,
});
