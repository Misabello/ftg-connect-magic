import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";

import { PageHeader } from "@/components/ftg/PageHeader";
import { useI18n } from "@/hooks/useI18n";
import { ADMIN_SUBNAV, findSubNavItem } from "@/lib/ftg/nav";

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

function AdministracionLayout() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = findSubNavItem(ADMIN_SUBNAV, pathname);

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
        {current && !current.exact && (
          <>
            <span className="mx-1.5">/</span>
            <span className="text-foreground">{current.label}</span>
          </>
        )}
      </nav>

      <PageHeader
        title={current && !current.exact ? current.label : t("page.administracion.title")}
        description={t("page.administracion.desc")}
      />

      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
