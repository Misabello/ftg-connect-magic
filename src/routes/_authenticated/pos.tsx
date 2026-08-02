import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";

import { StagePlaceholder } from "@/components/ftg/StagePlaceholder";

export const Route = createFileRoute("/_authenticated/pos")({
  head: () => ({
    meta: [
      { title: "Punto de venta — FTG ONE" },
      { name: "description", content: "Punto de venta offline-first de Fotográfica." },
      { property: "og:title", content: "Punto de venta — FTG ONE" },
      { property: "og:description", content: "Punto de venta offline-first de Fotográfica." },
    ],
  }),
  component: () => (
    <StagePlaceholder
      title="Punto de venta"
      description="Módulo prioritario del MVP: catálogo visual, carrito, medios de pago y caja."
      stage="Etapa 2 (catálogo, POS, caja, ventas y pagos) y Etapa 3 (offline)"
      icon={ShoppingCart}
      bullets={[
        "Catálogo visual por categorías y búsqueda por SKU o código de barras",
        "Carrito, descuentos autorizados y pagos combinados",
        "Apertura y cierre de caja por punto de venta",
        "Guardado local en IndexedDB y cola de sincronización",
        "Comprobante interno y factura desacoplada de la venta",
        "Estado online/offline siempre visible",
      ]}
    />
  ),
});