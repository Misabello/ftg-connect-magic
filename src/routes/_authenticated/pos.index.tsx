import { createFileRoute } from "@tanstack/react-router";

import { PosWorkspace } from "@/components/ftg/pos/PosWorkspace";

export const Route = createFileRoute("/_authenticated/pos/")({
  validateSearch: (search: Record<string, unknown>) => {
    const raw = search["cobrar"];
    return { cobrar: raw === "1" || raw === 1 || raw === true ? true : undefined };
  },
  head: () => ({
    meta: [
      { title: "Vender y cobrar — FTG ONE" },
      { name: "description", content: "Catálogo, carrito, medios de pago combinados y arqueo de caja por puesto." },
      { property: "og:title", content: "Vender y cobrar — FTG ONE" },
      { property: "og:description", content: "Operá el punto de venta: catálogo, cobros y cierre de caja." },
    ],
  }),
  component: PosRoute,
});

function PosRoute() {
  const { cobrar } = Route.useSearch();
  return <PosWorkspace autoCheckout={!!cobrar} />;
}