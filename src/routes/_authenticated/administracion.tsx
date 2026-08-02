import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";

import { StagePlaceholder } from "@/components/ftg/StagePlaceholder";

export const Route = createFileRoute("/_authenticated/administracion")({
  head: () => ({
    meta: [
      { title: "Administración — FTG ONE" },
      { name: "description", content: "Cuentas por cobrar y pagar, tesorería y cajas." },
      { property: "og:title", content: "Administración — FTG ONE" },
      { property: "og:description", content: "Cuentas por cobrar y pagar, tesorería y cajas." },
    ],
  }),
  component: () => (
    <StagePlaceholder
      title="Administración y finanzas"
      description="Cuentas por cobrar y pagar, tesorería, arqueos y rendiciones."
      stage="Etapa 5"
      icon={Wallet}
      bullets={[
        "Cuentas por cobrar con vencimientos y antigüedad de deuda",
        "Cuentas por pagar con proveedores y centros de costo",
        "Apertura y cierre de caja, ingresos y egresos",
        "Arqueos, diferencias y rendiciones por punto de venta",
        "Indicadores de flujo de caja estimado",
        "Capa preparada para integración contable externa",
      ]}
    />
  ),
});