import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, type AppRole } from "@/lib/ftg/roles";

export const Route = createFileRoute("/_authenticated/configuracion/roles")({
  head: () => ({
    meta: [
      { title: "Roles y permisos — FTG ONE" },
      { name: "description", content: "Catálogo de roles técnicos y permisos disponibles en la plataforma FTG." },
      { property: "og:title", content: "Roles y permisos — FTG ONE" },
      { property: "og:description", content: "Catálogo de roles y permisos de FTG ONE." },
    ],
  }),
  component: RolesPage,
});

function RolesPage() {
  const { data } = useQuery({
    queryKey: ["rbac-catalog"],
    queryFn: async () => {
      const [roles, permissions, links] = await Promise.all([
        supabase.from("roles" as never).select("*"),
        supabase.from("permissions" as never).select("*"),
        supabase.from("role_permissions" as never).select("*"),
      ]);
      return {
        roles: (roles.data ?? []) as any[],
        permissions: (permissions.data ?? []) as any[],
        links: (links.data ?? []) as any[],
      };
    },
  });

  const roles = data?.roles ?? [];
  const permissions = data?.permissions ?? [];
  const links = data?.links ?? [];

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Los roles técnicos son fijos: <strong>admin</strong>, <strong>management</strong>, <strong>supervisor</strong>,{" "}
        <strong>executive</strong> y <strong>seller</strong>. Los nombres visibles pueden variar por país sin afectar la
        lógica del sistema.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((role) => {
          const perms = links
            .filter((l) => l.role_key === role.key || l.role_id === role.id)
            .map((l) => permissions.find((p) => p.id === l.permission_id || p.key === l.permission_key))
            .filter(Boolean);
          return (
            <article key={role.id ?? role.key} className="surface-card space-y-3 p-4">
              <header className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">
                    {ROLE_LABELS[(role.key ?? role.name) as AppRole] ?? role.display_name ?? role.key}
                  </h2>
                  <p className="text-xs text-muted-foreground">{role.key ?? role.name}</p>
                </div>
                <Badge variant="secondary">{perms.length} permisos</Badge>
              </header>
              {role.description && <p className="text-xs text-muted-foreground">{role.description}</p>}
              <div className="flex flex-wrap gap-1.5">
                {perms.slice(0, 24).map((p: any) => (
                  <span key={p.id ?? p.key} className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                    {p.description ?? p.key}
                  </span>
                ))}
                {perms.length === 0 && <span className="text-xs text-muted-foreground">Acceso operativo completo.</span>}
              </div>
            </article>
          );
        })}
        {roles.length === 0 && (
          <p className="text-sm text-muted-foreground">Aún no hay catálogo de roles cargado.</p>
        )}
      </div>
    </div>
  );
}
