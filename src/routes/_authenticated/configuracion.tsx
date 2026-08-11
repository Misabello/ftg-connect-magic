import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";

import { PageHeader } from "@/components/ftg/PageHeader";
import { useI18n } from "@/hooks/useI18n";
import { CONFIG_SUBNAV, findSubNavItem } from "@/lib/ftg/nav";

export const Route = createFileRoute("/_authenticated/configuracion")({
  component: ConfiguracionLayout,
});

function ConfiguracionLayout() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const current = findSubNavItem(CONFIG_SUBNAV, pathname, search);

  return (
    <div className="space-y-6">
      <nav aria-label="Ruta" className="text-xs text-muted-foreground">
        <Link to="/inicio" className="hover:text-foreground">
          Inicio
        </Link>
        <span className="mx-1.5">/</span>
        <Link to="/configuracion" search={{ tab: undefined }} className="hover:text-foreground">
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

      <p className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        Actualmente los módulos operativos están habilitados para todos los roles. Los permisos específicos podrán
        configurarse en una próxima etapa.
      </p>

      <Outlet />
    </div>
  );
}
