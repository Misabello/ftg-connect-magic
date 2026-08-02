import { createFileRoute } from "@tanstack/react-router";

import { PosWorkspace } from "@/components/ftg/pos/PosWorkspace";

export const Route = createFileRoute("/_authenticated/pos")({
  head: () => ({
    meta: [
      { title: "Punto de venta — FTG ONE" },
      { name: "description", content: "Punto de venta de Fotográfica: catálogo, carrito, pagos y caja." },
      { property: "og:title", content: "Punto de venta — FTG ONE" },
      { property: "og:description", content: "Catálogo, carrito, medios de pago combinados y arqueo de caja." },
    ],
  }),
  component: () => <PosWorkspace />,
});
