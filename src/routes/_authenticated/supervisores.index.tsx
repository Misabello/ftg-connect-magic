import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Camera, Receipt, Store, Target, Wallet } from "lucide-react";

import { StatCard } from "@/components/ftg/StatCard";
import { ParkTrendCharts } from "@/components/ftg/supervision/ParkTrendCharts";
import { EmptyState, Loading, Panel } from "@/components/ftg/supervision/SupervisionShell";
import { useScope } from "@/hooks/useScope";
import { useSupervision, isOffline } from "@/hooks/useSupervision";
import { formatMoney, formatNumber, relativeTime } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/supervisores/")({
  head: () => ({
    meta: [
      { title: "Resumen del parque — Supervisores FTG ONE" },
      { name: "description", content: "Estado general del parque: ventas del día, cajas, dispositivos e incidentes." },
      { property: "og:title", content: "Resumen del parque — Supervisores FTG ONE" },
      { property: "og:description", content: "Panel de supervisión del parque en tiempo real." },
    ],
  }),
  component: ResumenParque,
});

function ResumenParque() {
  const { activeLocationId, activeLocation } = useScope();
  const { data, isLoading } = useSupervision(activeLocationId);
  if (isLoading || !data) return <Loading />;

  const currency = activeLocation?.currency_code ?? "ARS";
  const salesTotal = data.sales.filter((s) => s.status === "completada").reduce((a, s) => a + Number(s.total ?? 0), 0);
  const tickets = data.sales.filter((s) => s.status === "completada").length;
  const openSessions = data.sessions.filter((s) => s.status === "abierta");
  const offlineDevices = data.devices.filter((d) => isOffline(d.last_sync_at));
  const openIncidents = data.incidents.filter((i) => i.status !== "resuelto");
  const target = Number(data.operationDay?.sales_target ?? 0);
  const lastSync = data.devices
    .map((d) => d.last_sync_at)
    .filter(Boolean)
    .sort()
    .at(-1);
  const soldPhotos = data.photos.filter((p) => p.status === "vendida").length;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Ventas del día" value={formatMoney(salesTotal, currency)} icon={Wallet} />
        <StatCard label="Tickets" value={formatNumber(tickets)} hint={`Ticket promedio ${formatMoney(tickets ? salesTotal / tickets : 0, currency)}`} icon={Receipt} />
        <StatCard
          label="Objetivo diario"
          value={target ? formatMoney(target, currency) : "Sin objetivo"}
          hint={target ? `Cumplimiento ${Math.round((salesTotal / target) * 100)}%` : "Definilo en Operaciones"}
          icon={Target}
          tone={target && salesTotal >= target ? "success" : "default"}
        />
        <StatCard
          label="Puntos de venta"
          value={`${openSessions.length}/${data.pos.length} abiertos`}
          icon={Store}
          tone={openSessions.length === 0 ? "warning" : "default"}
        />
        <StatCard
          label="Dispositivos offline"
          value={formatNumber(offlineDevices.length)}
          hint={`Última sincronización ${relativeTime(lastSync)}`}
          icon={AlertTriangle}
          tone={offlineDevices.length > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Fotos vendidas"
          value={`${soldPhotos}/${data.photos.length}`}
          hint={data.photos.length ? `Conversión ${Math.round((soldPhotos / data.photos.length) * 100)}%` : "Sin capturas hoy"}
          icon={Camera}
        />
      </div>

      <ParkTrendCharts locationId={activeLocationId} currency={currency} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Incidentes activos" hint="Reportados desde Operaciones">
          {openIncidents.length === 0 ? (
            <EmptyState message="Sin incidentes abiertos en el parque." />
          ) : (
            <ul className="space-y-2">
              {openIncidents.slice(0, 6).map((i) => (
                <li key={i.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{i.title}</span>
                    <span className="text-xs text-muted-foreground">{i.severity}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{relativeTime(i.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Personal presente" hint="Asignaciones de la jornada">
          {data.staff.length === 0 ? (
            <EmptyState message="Todavía no se registró personal para hoy." />
          ) : (
            <ul className="space-y-2">
              {data.staff.map((s: any) => (
                <li key={s.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span>{s.person_name}</span>
                  <span className="text-xs text-muted-foreground">{s.role}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
