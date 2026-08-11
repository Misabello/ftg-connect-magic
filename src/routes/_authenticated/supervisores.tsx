import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";

import { PageHeader } from "@/components/ftg/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useScope } from "@/hooks/useScope";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/supervisores")({
  component: SupervisoresLayout,
});

type MenuItem = { to: string; label: string; exact?: boolean; group: string };

export const SUPERVISOR_MENU: MenuItem[] = [
  { to: "/supervisores", label: "Resumen del parque", exact: true, group: "General" },
  { to: "/supervisores/operativo", label: "Control operativo", group: "Controles" },
  { to: "/supervisores/puntos-venta", label: "Control de puntos de venta", group: "Controles" },
  { to: "/supervisores/cajas", label: "Control de cajas", group: "Controles" },
  { to: "/supervisores/ventas", label: "Control de ventas", group: "Controles" },
  { to: "/supervisores/inventario", label: "Control de inventario", group: "Controles" },
  { to: "/supervisores/alertas", label: "Alertas e incidentes", group: "Seguimiento" },
  { to: "/supervisores/cierre", label: "Cierre diario", group: "Seguimiento" },
  { to: "/supervisores/predicciones", label: "Predicciones con IA", group: "Análisis" },
  { to: "/supervisores/reportes", label: "Reportes", group: "Análisis" },
];

const GROUPS = ["General", "Controles", "Seguimiento", "Análisis"];

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

      {!activeLocationId && (
        <p className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Elegí un parque para ver la información de supervisión.
        </p>
      )}

      {activeLocation && (
        <div className="grid gap-6 lg:grid-cols-[236px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <nav aria-label="Secciones de supervisión" className="rounded-xl border border-border bg-card p-2">
              {GROUPS.map((group) => {
                const items = SUPERVISOR_MENU.filter((i) => i.group === group);
                if (items.length === 0) return null;
                return (
                  <div key={group} className="mb-2 last:mb-0">
                    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      {group}
                    </p>
                    <ul className="space-y-0.5">
                      {items.map((item) => {
                        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
                        return (
                          <li key={item.to}>
                            <Link
                              to={item.to as never}
                              className={cn(
                                "block rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                                active
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                              )}
                            >
                              {item.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </nav>
          </aside>

          <section className="min-w-0 space-y-4">
            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
              <h2 className="text-lg font-semibold">{current?.label ?? "Supervisores"}</h2>
              <span className="text-xs text-muted-foreground">{activeLocation.name}</span>
            </header>
            <Outlet />
          </section>
        </div>
      )}
    </div>
  );
}
