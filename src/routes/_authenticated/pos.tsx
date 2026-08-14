import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";

import { POS_SUBNAV, findSubNavItem } from "@/lib/ftg/nav";

export const Route = createFileRoute("/_authenticated/pos")({
  head: () => ({
    meta: [
      { title: "Punto de venta — FTG ONE" },
      { name: "description", content: "Punto de venta de Fotográfica: catálogo, carrito, pagos y caja." },
      { property: "og:title", content: "Punto de venta — FTG ONE" },
      { property: "og:description", content: "Catálogo, carrito, medios de pago combinados y arqueo de caja." },
    ],
  }),
  component: PosLayout,
});

function PosLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = findSubNavItem(POS_SUBNAV, pathname);

  return (
    <div className="space-y-6">
      <nav aria-label="Ruta" className="text-xs text-muted-foreground">
        <Link to="/inicio" className="hover:text-foreground">
          Inicio
        </Link>
        <span className="mx-1.5">/</span>
        <Link to="/pos" search={{ cobrar: undefined }} className="hover:text-foreground">
          Punto de venta
        </Link>
        {current && current.to !== "/pos" && (
          <>
            <span className="mx-1.5">/</span>
            <span className="text-foreground">{current.label}</span>
          </>
        )}
      </nav>
      <Outlet />
    </div>
  );
}
