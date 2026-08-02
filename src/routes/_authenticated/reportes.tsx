import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";

import { StagePlaceholder } from "@/components/ftg/StagePlaceholder";

export const Route = createFileRoute("/_authenticated/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes — FTG ONE" },
      { name: "description", content: "Reportes consolidados por país, sede, evento y moneda." },
      { property: "og:title", content: "Reportes — FTG ONE" },
      { property: "og:description", content: "Reportes consolidados por país, sede, evento y moneda." },
    ],
  }),
  component: () => (
    <StagePlaceholder
      title="Reportes"
      description="Análisis de ventas, conversión fotográfica y consolidación multimoneda."
      stage="Etapa 5"
      icon={BarChart3}
      bullets={[
        "Ventas por día, sede, categoría y medio de pago",
        "Comparación fotografías vs. merchandising",
        "Conversión entre fotografías tomadas y vendidas",
        "Consolidación en ARS, BRL, EUR o USD con tipo de cambio usado",
        "Ventas netas, impuestos y ventas brutas separadas",
        "Filtros por empresa, país, sede, evento y moneda",
      ]}
    />
  ),
});