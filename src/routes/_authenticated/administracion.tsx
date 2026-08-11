import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";

import { PageHeader } from "@/components/ftg/PageHeader";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/administracion")({
  head: () => ({
    meta: [
      { title: "Administración — FTG ONE" },
      { name: "description", content: "Cuentas por cobrar y pagar, reportes y estados contables." },
      { property: "og:title", content: "Administración — FTG ONE" },
      { property: "og:description", content: "Cuentas por cobrar y pagar, reportes y estados contables." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdministracionLayout,
});

export const ADMIN_MENU: { to: string; label: string; children?: { to: string; label: string }[] }[] = [
  { to: "/administracion/cobrar", label: "Ctas a Cobrar" },
  { to: "/administracion/pagar", label: "Ctas a Pagar" },
  {
    to: "/administracion/reportes",
    label: "Reportes",
    children: [
      { to: "/administracion/reportes", label: "Sedes y puntos de venta" },
      { to: "/administracion/reportes/facturas", label: "Facturas automatizadas" },
      { to: "/administracion/reportes/cajas", label: "Arqueos y cajas" },
    ],
  },
  {
    to: "/administracion/eecc",
    label: "EECC",
    children: [
      { to: "/administracion/eecc", label: "Sumas y saldos" },
      { to: "/administracion/eecc/resultados", label: "Estado de resultados" },
      { to: "/administracion/eecc/situacion", label: "Situación patrimonial" },
      { to: "/administracion/eecc/diario", label: "Libro diario" },
      { to: "/administracion/eecc/mayor", label: "Libro mayor" },
    ],
  },
];

function AdministracionLayout() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = ADMIN_MENU.find((i) => pathname.startsWith(i.to));
  const currentChild = current?.children?.filter((c) => pathname === c.to).at(0);

  return (
    <div className="space-y-6">
      <nav aria-label="Ruta" className="text-xs text-muted-foreground">
        <Link to="/inicio" className="hover:text-foreground">
          Inicio
        </Link>
        <span className="mx-1.5">/</span>
        <Link to="/administracion" className="hover:text-foreground">
          {t("page.administracion.title")}
        </Link>
        {current && (
          <>
            <span className="mx-1.5">/</span>
            <span className={cn(currentChild ? "" : "text-foreground")}>{current.label}</span>
          </>
        )}
        {currentChild && (
          <>
            <span className="mx-1.5">/</span>
            <span className="text-foreground">{currentChild.label}</span>
          </>
        )}
      </nav>

      <PageHeader title={t("page.administracion.title")} description={t("page.administracion.desc")} />

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <ul className="space-y-1 rounded-xl border border-border bg-card p-2">
            {ADMIN_MENU.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to as never}
                    className={cn(
                      "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                  {item.children && active && (
                    <ul className="mt-1 space-y-0.5 border-l border-border pl-3">
                      {item.children.map((child) => (
                        <li key={child.to}>
                          <Link
                            to={child.to as never}
                            className={cn(
                              "block rounded-lg px-3 py-1.5 text-[13px] transition-colors",
                              pathname === child.to
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
