import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Boxes,
  Building2,
  Camera,
  ChevronRight,
  ClipboardList,
  Home,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

import { Logo } from "@/components/ftg/Logo";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { useScope } from "@/hooks/useScope";
import { cn } from "@/lib/utils";
import type { ModuleKey } from "@/lib/ftg/roles";
import { SECTION_SUBNAV, findSubNavItem } from "@/lib/ftg/nav";

type Item = { key: ModuleKey; to: string; icon: typeof Home; stage?: string };

const ITEMS: Item[] = [
  { key: "inicio", to: "/inicio", icon: Home },
  { key: "pos", to: "/pos", icon: ShoppingCart },
  { key: "fotografias", to: "/fotografias", icon: Camera },
  { key: "operaciones", to: "/operaciones", icon: ClipboardList },
  { key: "supervisores", to: "/supervisores", icon: ShieldCheck },
  { key: "inventario", to: "/inventario", icon: Boxes },
  { key: "administracion", to: "/administracion", icon: Wallet },
  { key: "clientes", to: "/clientes", icon: Users },
  { key: "proveedores", to: "/proveedores", icon: Truck },
  { key: "reportes", to: "/reportes", icon: BarChart3 },
  { key: "configuracion", to: "/configuracion", icon: Settings },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { can } = useAuth();
  const { locations } = useScope();
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({});

  // La sección de la ruta actual queda abierta automáticamente.
  useEffect(() => {
    const current = ITEMS.find((i) => pathname.startsWith(i.to) && SECTION_SUBNAV[i.key]);
    if (current) setOpenKeys((prev) => (prev[current.key] === undefined ? { ...prev, [current.key]: true } : prev));
    if (pathname.startsWith("/sedes")) setOpenKeys((prev) => (prev["sedes"] === undefined ? { ...prev, sedes: true } : prev));
  }, [pathname]);

  const toggle = (key: string, fallbackOpen: boolean) =>
    setOpenKeys((prev) => ({ ...prev, [key]: !(prev[key] ?? fallbackOpen) }));

  return (
    <nav className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-5 py-4">
        <Logo />
      </div>
      <ul className="flex-1 space-y-1 overflow-y-auto p-3">
        {ITEMS.filter((item) => can(item.key)).map((item) => {
          const active = pathname.startsWith(item.to);
          const subnav = SECTION_SUBNAV[item.key];
          const activeSub = active && subnav ? findSubNavItem(subnav, pathname, search) : undefined;
          const open = openKeys[item.key] ?? active;
          return (
            <li key={item.key}>
              <Link
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[var(--shadow-pop)]"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
                <span className="flex-1">{t(`nav.${item.key}`)}</span>
                {item.stage && !active && (
                  <span className="rounded-md bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-medium text-sidebar-accent-foreground/70">
                    {item.stage}
                  </span>
                )}
                {subnav && (
                  <button
                    type="button"
                    aria-label={open ? "Cerrar submenú" : "Abrir submenú"}
                    aria-expanded={open}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggle(item.key, active);
                    }}
                    className="-mr-1 rounded p-0.5 opacity-70 transition hover:bg-sidebar-accent hover:opacity-100"
                  >
                    <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
                  </button>
                )}
              </Link>
              {open && subnav && (
                <ul className="mb-2 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
                  {subnav.map((sub, index) => {
                    const group = sub.group;
                    const showGroup = group && group !== subnav[index - 1]?.group;
                    const isActive = activeSub?.label === sub.label && activeSub?.to === sub.to;
                    return (
                      <li key={`${sub.to}-${sub.label}`}>
                        {showGroup && (
                          <p className="px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                            {group}
                          </p>
                        )}
                        <Link
                          to={sub.to as never}
                          search={sub.search as never}
                          onClick={onNavigate}
                          className={cn(
                            "block rounded-lg px-3 py-1.5 text-[13px] transition-colors",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          )}
                        >
                          {sub.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}

        {can("sedes") && (
          <li className="pt-3">
            <Link
              to="/sedes"
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                pathname === "/sedes"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[var(--shadow-pop)]"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Building2 className="h-[18px] w-[18px]" />
              <span className="flex-1">{t("nav.sedes")}</span>
              <button
                type="button"
                aria-label={(openKeys["sedes"] ?? pathname.startsWith("/sedes")) ? "Cerrar submenú" : "Abrir submenú"}
                aria-expanded={openKeys["sedes"] ?? pathname.startsWith("/sedes")}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggle("sedes", pathname.startsWith("/sedes"));
                }}
                className="-mr-1 rounded p-0.5 opacity-70 transition hover:bg-sidebar-accent hover:opacity-100"
              >
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform",
                    (openKeys["sedes"] ?? pathname.startsWith("/sedes")) && "rotate-90",
                  )}
                />
              </button>
            </Link>
            <ul hidden={!(openKeys["sedes"] ?? pathname.startsWith("/sedes"))} className="mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
              {locations.map((loc) => (
                <li key={loc.id}>
                  <Link
                    to="/sedes/$locationId"
                    params={{ locationId: loc.id }}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors",
                      pathname.startsWith(`/sedes/${loc.id}`)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Store className="h-4 w-4" />
                    <span className="flex-1 truncate">{loc.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        )}
      </ul>
      <div className="border-t border-sidebar-border px-5 py-3 text-[11px] text-sidebar-foreground/50">
        {t("nav.footer")}
      </div>
    </nav>
  );
}