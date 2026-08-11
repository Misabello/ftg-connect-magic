import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/configuracion/parametros")({
  head: () => ({
    meta: [
      { title: "Parámetros administrativos — FTG ONE" },
      { name: "description", content: "Monedas, impuestos, numeraciones y parámetros administrativos por país." },
      { property: "og:title", content: "Parámetros administrativos — FTG ONE" },
      { property: "og:description", content: "Configuración administrativa por país y empresa." },
    ],
  }),
  component: () => (
    <div className="surface-card p-8 text-center text-sm text-muted-foreground">
      Los parámetros administrativos (monedas, impuestos y numeraciones) se configuran en la Etapa 2.
    </div>
  ),
});
