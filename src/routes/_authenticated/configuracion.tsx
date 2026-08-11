import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";

import { PageHeader } from "@/components/ftg/PageHeader";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/configuracion")({
  component: ConfiguracionLayout,
});

type SubItem = { to: string; label: string; search?: Record<string, string>; exact?: boolean };

const SUBMENU: SubItem[] = [
  { to: "/configuracion/usuarios", label: "Usuarios" },
  { to: "/configuracion/roles", label: "Roles y permisos" },
  { to: "/configuracion/empleados", label: "Empleados" },
  { to: "/configuracion/vacaciones", label: "Vacaciones y licencias" },
  { to: "/configuracion", label: "Empresas y países", search: { tab: "paises" }, exact: true },
  { to: "/configuracion", label: "Sedes y puntos de venta", search: { tab: "sedes" }, exact: true },
  { to: "/configuracion/parametros", label: "Parámetros administrativos" },
  { to: "/configuracion/auditoria", label: "Auditoría" },
];

function ConfiguracionLayout() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = SUBMENU.find((i) => !i.exact && pathname.startsWith(i.to));

  return (
    <div className="space-y-6">
      <nav aria-label="Ruta" className="text-xs text-muted-foreground">
        <Link to="/inicio" className="hover:text-foreground">
          Inicio
        </Link>
        <span className="mx-1.5">/</span>
        <Link to="/configuracion" className="hover:text-foreground">
          {t("page.configuracion.title")}
        </Link>
        {current && (
          <>
            <span className="mx-1.5">/</span>
            <span className="text-foreground">{current.label}</span>
          </>
        )}
      </nav>

      <PageHeader title={t("page.configuracion.title")} description={t("page.configuracion.desc")} />

      <div className="flex flex-wrap gap-2">
        {SUBMENU.map((item) => {
          const active = item.exact ? false : pathname.startsWith(item.to);
          return (
            <Link
              key={item.label}
              to={item.to}
              search={item.search as never}
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

      <p className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        Actualmente los módulos operativos están habilitados para todos los roles. Los permisos específicos podrán
        configurarse en una próxima etapa.
      </p>

      <Outlet />
    </div>
  );
}
