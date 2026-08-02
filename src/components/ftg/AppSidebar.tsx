import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Boxes,
  Camera,
  ClipboardList,
  Home,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
} from "lucide-react";

import { Logo } from "@/components/ftg/Logo";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { ModuleKey } from "@/lib/ftg/roles";

type Item = { key: ModuleKey; label: string; to: string; icon: typeof Home; stage?: string };

const ITEMS: Item[] = [
  { key: "inicio", label: "Inicio", to: "/inicio", icon: Home },
  { key: "pos", label: "Punto de venta", to: "/pos", icon: ShoppingCart },
  { key: "fotografias", label: "Fotografías", to: "/fotografias", icon: Camera },
  { key: "operaciones", label: "Operaciones", to: "/operaciones", icon: ClipboardList },
  { key: "inventario", label: "Inventario", to: "/inventario", icon: Boxes, stage: "E5" },
  { key: "administracion", label: "Administración", to: "/administracion", icon: Wallet, stage: "E5" },
  { key: "clientes", label: "Clientes", to: "/clientes", icon: Users, stage: "E5" },
  { key: "reportes", label: "Reportes", to: "/reportes", icon: BarChart3, stage: "E5" },
  { key: "configuracion", label: "Configuración", to: "/configuracion", icon: Settings },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { can } = useAuth();
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
                <span className="flex-1">{item.label}</span>
                {item.stage && !active && (
                  <span className="rounded-md bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-medium text-sidebar-accent-foreground/70">
                    {item.stage}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-sidebar-border px-5 py-3 text-[11px] text-sidebar-foreground/50">
        MVP · Etapa 4 completada
      </div>
    </nav>
  );
}