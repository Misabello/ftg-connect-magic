import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { EmptyState, Loading, Panel } from "@/components/ftg/supervision/SupervisionShell";
import { useScope } from "@/hooks/useScope";
import { isOffline, useSupervision } from "@/hooks/useSupervision";
import { formatNumber, relativeTime } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/supervisores/alertas")({
  head: () => ({
    meta: [
      { title: "Alertas e incidentes — Supervisores FTG ONE" },
      { name: "description", content: "Incidentes operativos, dispositivos offline y cajas sin abrir." },
      { property: "og:title", content: "Alertas e incidentes — Supervisores FTG ONE" },
      { property: "og:description", content: "Alertas activas del parque." },
    ],
  }),
  component: Alertas,
});

function Alertas() {
  const { activeLocationId } = useScope();
  const { data, isLoading } = useSupervision(activeLocationId);
  if (isLoading || !data) return <Loading />;

  const offline = data.devices.filter((d) => isOffline(d.last_sync_at));
  const pending = data.devices.filter((d) => Number(d.pending_operations ?? 0) > 0);
  const sinCaja = data.pos.filter((p) => !data.sessions.some((s) => s.point_of_sale_id === p.id && s.status === "abierta"));
  const incidents = data.incidents.filter((i) => i.status !== "resuelto");

  return (
    <div className="space-y-4">
      <Panel title="Alertas técnicas" hint="Sincronización y disponibilidad">
        {offline.length === 0 && pending.length === 0 && sinCaja.length === 0 ? (
          <EmptyState message="Sin alertas técnicas activas." />
        ) : (
          <ul className="space-y-2 text-sm">
            {offline.map((d) => (
              <li key={`off-${d.id}`} className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                <span>{d.name} sin sincronizar</span>
                <span className="text-xs text-muted-foreground">{relativeTime(d.last_sync_at)}</span>
              </li>
            ))}
            {pending.map((d) => (
              <li key={`pend-${d.id}`} className="flex items-center justify-between rounded-lg border border-warning/40 bg-warning/10 px-3 py-2">
                <span>{d.name} con operaciones pendientes</span>
                <span className="text-xs">{formatNumber(Number(d.pending_operations ?? 0))}</span>
              </li>
            ))}
            {sinCaja.map((p) => (
              <li key={`caja-${p.id}`} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span>{p.name} sin caja abierta</span>
                <Badge variant="secondary">Revisar</Badge>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Incidentes" hint="Reportes de la operación">
        {incidents.length === 0 ? (
          <EmptyState message="Sin incidentes abiertos." />
        ) : (
          <ul className="divide-y divide-border text-sm">
            {incidents.map((i) => (
              <li key={i.id} className="py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{i.title}</span>
                  <Badge variant={i.severity === "critica" || i.severity === "alta" ? "destructive" : "secondary"}>
                    {i.severity}
                  </Badge>
                </div>
                {i.description && <p className="mt-1 text-xs text-muted-foreground">{i.description}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{i.category} · {relativeTime(i.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
