import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";

import { PageHeader } from "@/components/ftg/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useScope } from "@/hooks/useScope";
import { SUPERVISOR_SUBNAV, findSubNavItem } from "@/lib/ftg/nav";

export const Route = createFileRoute("/_authenticated/supervisores")({
  component: SupervisoresLayout,
});

function SupervisoresLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { locations, activeLocationId, setActiveLocation, activeLocation } = useScope();
  const current = findSubNavItem(SUPERVISOR_SUBNAV, pathname);

  return (
    <div className="space-y-6">
      <nav aria-label="Ruta" className="text-xs text-muted-foreground">
        <Link to="/inicio" className="hover:text-foreground">
          Inicio
        </Link>
        <span className="mx-1.5">/</span>
        <Link to="/supervisores" className="hover:text-foreground">
          Supervisores
        </Link>
        {current && !current.exact && (
          <>
            <span className="mx-1.5">/</span>
            <span className="text-foreground">{current.label}</span>
          </>
        )}
      </nav>

      <PageHeader
        title={current?.label ?? "Supervisores"}
        description="Control unificado del parque: operación, puntos de venta, cajas, ventas, inventario y predicciones."
        actions={
          <Select value={activeLocationId ?? ""} onValueChange={setActiveLocation}>
            <SelectTrigger className="w-60">
              <SelectValue placeholder="Elegí un parque" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {!activeLocationId && (
        <p className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Elegí un parque para ver la información de supervisión.
        </p>
      )}

      {activeLocation && (
        <section className="min-w-0 space-y-4">
          <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
            <h2 className="text-lg font-semibold">{current?.label ?? "Supervisores"}</h2>
            <span className="text-xs text-muted-foreground">{activeLocation.name}</span>
          </header>
          <Outlet />
        </section>
      )}
    </div>
  );
}
