import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";

import { PageHeader } from "@/components/ftg/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useScope } from "@/hooks/useScope";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/supervisores")({
  component: SupervisoresLayout,
});

type MenuItem = { to: string; label: string; exact?: boolean };

export const SUPERVISOR_MENU: MenuItem[] = [
  { to: "/supervisores", label: "Resumen del parque", exact: true },
  { to: "/supervisores/operativo", label: "Control operativo" },
  { to: "/supervisores/puntos-venta", label: "Control de puntos de venta" },
  { to: "/supervisores/cajas", label: "Control de cajas" },
  { to: "/supervisores/ventas", label: "Control de ventas" },
  { to: "/supervisores/inventario", label: "Control de inventario" },
  { to: "/supervisores/alertas", label: "Alertas e incidentes" },
  { to: "/supervisores/cierre", label: "Cierre diario" },
  { to: "/supervisores/predicciones", label: "Predicciones con IA" },
  { to: "/supervisores/reportes", label: "Reportes" },
];

function SupervisoresLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { locations, activeLocationId, setActiveLocation, activeLocation } = useScope();

  const current = SUPERVISOR_MENU.find((i) =>
    i.exact ? pathname === i.to : pathname.startsWith(i.to),
  );

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
        title="Supervisores"
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

      <div className="flex flex-wrap gap-2">
        {SUPERVISOR_MENU.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to as never}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {!activeLocationId && (
        <p className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Elegí un parque para ver la información de supervisión.
        </p>
      )}

      {activeLocation && <Outlet />}
    </div>
  );
}
