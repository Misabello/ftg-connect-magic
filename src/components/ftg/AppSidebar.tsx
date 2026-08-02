import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Boxes,
  Building2,
  Camera,
  ClipboardList,
  Home,
  Settings,
  ShoppingCart,
  Store,
  Users,
  Wallet,
} from "lucide-react";

import { Logo } from "@/components/ftg/Logo";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { useScope } from "@/hooks/useScope";
import { cn } from "@/lib/utils";
import type { ModuleKey } from "@/lib/ftg/roles";

type Item = { key: ModuleKey; to: string; icon: typeof Home; stage?: string };

const ITEMS: Item[] = [
  { key: "inicio", to: "/inicio", icon: Home },
  { key: "pos", to: "/pos", icon: ShoppingCart },
  { key: "fotografias", to: "/fotografias", icon: Camera },
  { key: "operaciones", to: "/operaciones", icon: ClipboardList },
  { key: "inventario", to: "/inventario", icon: Boxes },
  { key: "administracion", to: "/administracion", icon: Wallet },
  { key: "clientes", to: "/clientes", icon: Users },
  { key: "reportes", to: "/reportes", icon: BarChart3 },
  { key: "configuracion", to: "/configuracion", icon: Settings },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { can } = useAuth();
  const { locations } = useScope();
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-5 py-4">
        <Logo />
      </div>
      <ul className="flex-1 space-y-1 overflow-y-auto p-3">
        {ITEMS.filter((item) => can(item.key)).map((item) => {
          const active = pathname.startsWith(item.to);
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
              </Link>
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
            </Link>
            <ul className="mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
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