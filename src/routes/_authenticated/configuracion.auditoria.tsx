import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/configuracion/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoría — FTG ONE" },
      { name: "description", content: "Registro de acciones administrativas sobre usuarios, roles y legajos." },
      { property: "og:title", content: "Auditoría — FTG ONE" },
      { property: "og:description", content: "Trazabilidad de acciones administrativas en FTG ONE." },
    ],
  }),
  component: AuditoriaPage,
});

function AuditoriaPage() {
  const { data } = useQuery({
    queryKey: ["audit-admin"],
    queryFn: async () =>
      (
        await supabase
          .from("audit_logs")
          .select("id, action, entity, entity_id, details, created_at, user_id")
          .order("created_at", { ascending: false })
          .limit(200)
      ).data ?? [],
  });

  return (
    <section className="surface-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Acción</TableHead>
            <TableHead>Entidad</TableHead>
            <TableHead>Detalle</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data ?? []).map((row) => (
            <TableRow key={row.id}>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(row.created_at).toLocaleString()}
              </TableCell>
              <TableCell className="text-xs font-medium">{row.action}</TableCell>
              <TableCell className="text-xs">{row.entity}</TableCell>
              <TableCell className="max-w-md truncate text-[11px] text-muted-foreground">
                {row.details ? JSON.stringify(row.details) : "—"}
              </TableCell>
            </TableRow>
          ))}
          {(data ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                Sin registros de auditoría.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </section>
  );
}
