import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";

import { StagePlaceholder } from "@/components/ftg/StagePlaceholder";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — FTG ONE" },
      { name: "description", content: "Clientes corporativos y consumidores finales." },
      { property: "og:title", content: "Clientes — FTG ONE" },
      { property: "og:description", content: "Clientes corporativos y consumidores finales." },
    ],
  }),
  component: () => (
    <StagePlaceholder
      title="Clientes"
      description="Clientes corporativos (parques y predios) y consumidores finales con datos fiscales."
      stage="Etapa 5"
      icon={Users}
      bullets={[
        "Clientes corporativos vinculados a parques y eventos",
        "Consumidores finales opcionales en la venta",
        "Datos fiscales por país y condición impositiva",
        "Historial de compras y fotografías",
        "Saldos y documentos pendientes",
        "Consentimientos de uso de imagen",
      ]}
    />
  ),
});