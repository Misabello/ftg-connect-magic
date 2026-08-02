import { createFileRoute } from "@tanstack/react-router";
import { Boxes } from "lucide-react";

import { StagePlaceholder } from "@/components/ftg/StagePlaceholder";

export const Route = createFileRoute("/_authenticated/inventario")({
  head: () => ({
    meta: [
      { title: "Inventario — FTG ONE" },
      { name: "description", content: "Productos, stock por sede y movimientos trazables." },
      { property: "og:title", content: "Inventario — FTG ONE" },
      { property: "og:description", content: "Productos, stock por sede y movimientos trazables." },
    ],
  }),
  component: () => (
    <StagePlaceholder
      title="Inventario"
      description="Productos, stock por sede, depósito y punto de venta, con movimientos como eventos."
      stage="Etapa 5"
      icon={Boxes}
      bullets={[
        "Productos con SKU, código de barras, costo, precio e impuestos",
        "Stock por sede, depósito y punto de venta",
        "Transferencias, ajustes y recepción de mercadería",
        "Productos dañados y reservados",
        "Movimientos con usuario, dispositivo y fecha local",
        "Alertas de stock mínimo",
      ]}
    />
  ),
});