import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, CalendarRange, MapPin, MonitorSmartphone, Store, TriangleAlert } from "lucide-react";

import { PageHeader } from "@/components/ftg/PageHeader";
import { StatCard } from "@/components/ftg/StatCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useScope } from "@/hooks/useScope";
import { supabase } from "@/integrations/supabase/client";
import { relativeTime } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({
    meta: [
      { title: "Inicio — FTG ONE" },
      { name: "description", content: "Dashboard ejecutivo de la operación de Fotográfica." },
      { property: "og:title", content: "Inicio — FTG ONE" },
      { property: "og:description", content: "Dashboard ejecutivo de la operación de Fotográfica." },
    ],
  }),
  component: Inicio,
});

const STATUS_LABEL: Record<string, string> = {
  planificado: "Planificado",
  preparacion: "Preparación",
  listo: "Listo para abrir",
  en_operacion: "En operación",
  incidente: "Con incidente",
  cerrado: "Cerrado",
};

function Inicio() {
  const { activeLocation, activeLocationId, locations } = useScope();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", activeLocationId],
    queryFn: async () => {
      const [venues, events, pos, devices] = await Promise.all([
        supabase.from("venues").select("id, name, venue_type, location_id, corporate_client"),
        supabase.from("events").select("id, name, status, starts_at, ends_at, location_id, manager_name"),
        supabase.from("points_of_sale").select("id, name, code, pos_type, location_id, currency_code"),
        supabase.from("devices").select("id, name, last_sync_at, pending_operations, location_id"),
      ]);
      return {
        venues: venues.data ?? [],
        events: events.data ?? [],
        pos: pos.data ?? [],
        devices: devices.data ?? [],
      };
    },
  });

  const inScope = <T extends { location_id: string | null }>(rows: T[]) =>
    activeLocationId ? rows.filter((r) => r.location_id === activeLocationId) : rows;

  const venues = inScope(data?.venues ?? []);
  const events = inScope(data?.events ?? []);
  const pos = inScope(data?.pos ?? []);
  const devices = inScope(data?.devices ?? []);
  const pendingDevices = devices.filter((d) => (d.pending_operations ?? 0) > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${t("page.inicio.title")} · ${activeLocation?.name ?? "FTG ONE"}`}
        description={t("page.inicio.desc")}
        actions={
          <Badge variant="secondary" className="gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {activeLocation
              ? `${activeLocation.city ?? activeLocation.name} · ${activeLocation.currency_code}`
              : t("page.inicio.noLocation")}
          </Badge>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Sedes activas" value={String(locations.length)} icon={Building2} hint="Argentina y Brasil" />
          <StatCard label="Parques y predios" value={String(venues.length)} icon={MapPin} hint="En la sede activa" />
          <StatCard label="Puntos de venta" value={String(pos.length)} icon={Store} hint="Incluye puestos fotográficos" />
          <StatCard
            label="Dispositivos sin sincronizar"
            value={String(pendingDevices.length)}
            icon={MonitorSmartphone}
            tone={pendingDevices.length ? "warning" : "success"}
            hint={pendingDevices.length ? "Requieren sincronización" : "Todo sincronizado"}
          />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface-card p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <CalendarRange className="h-4 w-4 text-primary" /> Eventos y temporadas
          </h2>
          <ul className="mt-4 space-y-3">
            {events.length === 0 && (
              <li className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No hay eventos cargados para esta sede.
              </li>
            )}
            {events.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 rounded-xl bg-surface p-4">
                <div>
                  <p className="text-sm font-medium">{e.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.starts_at} → {e.ends_at ?? "sin cierre"} · {e.manager_name ?? "sin responsable"}
                  </p>
                </div>
                <Badge variant={e.status === "en_operacion" ? "default" : "secondary"}>
                  {STATUS_LABEL[e.status] ?? e.status}
                </Badge>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface-card p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <MonitorSmartphone className="h-4 w-4 text-primary" /> Sincronización por dispositivo
          </h2>
          <ul className="mt-4 space-y-3">
            {devices.length === 0 && (
              <li className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No hay dispositivos asignados a esta sede.
              </li>
            )}
            {devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface p-4">
                <div>
                  <p className="text-sm font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">Última sinc. {relativeTime(d.last_sync_at)}</p>
                </div>
                {d.pending_operations > 0 ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning">
                    <TriangleAlert className="h-3.5 w-3.5" /> {d.pending_operations} pendientes
                  </span>
                ) : (
                  <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                    Al día
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="surface-card p-6">
        <h2 className="text-base font-semibold">Puntos de venta de la sede</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pos.map((p) => (
            <article key={p.id} className="rounded-xl bg-surface p-4">
              <p className="text-sm font-medium">{p.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {p.code} · {p.pos_type.replace("_", " ")} · {p.currency_code}
              </p>
            </article>
          ))}
          {pos.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay puntos de venta en esta sede.</p>
          )}
        </div>
      </section>
    </div>
  );
}