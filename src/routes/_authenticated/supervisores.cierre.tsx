import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { StatCard } from "@/components/ftg/StatCard";
import { SyncDayButton } from "@/components/ftg/sync/SyncDayButton";
import { useDaySync } from "@/hooks/useDaySync";
import { EmptyState, Loading, Panel } from "@/components/ftg/supervision/SupervisionShell";
import { Badge } from "@/components/ui/badge";
import { useScope } from "@/hooks/useScope";
import { useSupervision } from "@/hooks/useSupervision";
import { formatMoney, formatNumber, relativeTime } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/supervisores/cierre")({
  head: () => ({
    meta: [
      { title: "Cierre diario — Supervisores FTG ONE" },
      { name: "description", content: "Resumen de cierre del día: caja por puesto, ventas, tickets y tareas pendientes." },
      { property: "og:title", content: "Cierre diario — Supervisores FTG ONE" },
      { property: "og:description", content: "Checklist, arqueo por punto de venta y balance del cierre del parque." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CierreDiario,
});

const sameDay = (value: string | null | undefined, day: string) => !!value && String(value).slice(0, 10) === day;

function CierreDiario() {
  const { activeLocationId, activeLocation } = useScope();
  const { data, isLoading } = useSupervision(activeLocationId);
  const { pendingCount } = useDaySync();
  if (isLoading || !data) return <Loading />;
  const currency = activeLocation?.currency_code ?? "ARS";
  const day = data.day;

  // Solo las cajas de la jornada actual entran en el cierre del día.
  const todaySessions = data.sessions.filter(
    (s) => sameDay(s.opened_at, day) || sameDay(s.closed_at, day),
  );
  const openToday = todaySessions.filter((s) => s.status === "abierta");
  const closedToday = todaySessions.filter((s) => s.status !== "abierta");
  // Cajas abiertas de jornadas anteriores: se muestran aparte para no ensuciar el día.
  const staleOpen = data.sessions.filter((s) => s.status === "abierta" && !sameDay(s.opened_at, day));

  const num = (v: unknown) => Number(v ?? 0);
  const ventas = data.sales.filter((s) => s.status === "completada").reduce((a, s) => a + num(s.total), 0);
  const egresos = data.tickets.filter((t: any) => t.kind !== "ingreso").reduce((a: number, t: any) => a + num(t.amount), 0);
  const ingresosTicket = data.tickets.filter((t: any) => t.kind === "ingreso").reduce((a: number, t: any) => a + num(t.amount), 0);
  const esperadoCaja = closedToday.reduce((a, s) => a + num(s.expected_amount), 0);
  const contadoCaja = closedToday.reduce((a, s) => a + num(s.counted_amount), 0);
  const diferenciaCaja = contadoCaja - esperadoCaja;

  const posName = (id: string | null) => data.pos.find((p) => p.id === id)?.name ?? "Sin puesto asignado";

  // Detalle por punto de venta: caja, ventas registradas y tickets del día.
  const detalle = data.pos.map((p) => {
    const sesiones = todaySessions.filter((s) => s.point_of_sale_id === p.id);
    const cerradas = sesiones.filter((s) => s.status !== "abierta");
    const ventasPos = data.sales.filter((s) => s.point_of_sale_id === p.id && s.status === "completada");
    const ticketsPos = data.tickets.filter((t: any) => t.point_of_sale_id === p.id);
    return {
      id: p.id,
      name: p.name,
      abiertas: sesiones.filter((s) => s.status === "abierta").length,
      cerradas: cerradas.length,
      esperado: cerradas.reduce((a, s) => a + num(s.expected_amount), 0),
      contado: cerradas.reduce((a, s) => a + num(s.counted_amount), 0),
      ventasCount: ventasPos.length,
      ventasTotal: ventasPos.reduce((a, s) => a + num(s.total), 0),
      ticketsTotal: ticketsPos.reduce((a: number, t: any) => a + (t.kind === "ingreso" ? num(t.amount) : -num(t.amount)), 0),
    };
  });

  type Item = { text: string; hint?: string };

  const pendientes: Item[] = [
    ...data.checklist
      .filter((c: any) => c.phase === "cierre" && !c.is_done)
      .map((c: any) => ({
        text: `Checklist de cierre: ${c.label ?? "tarea"}`,
        hint: c.is_required ? "Obligatoria" : "Opcional",
      })),
    ...openToday.map((s) => ({
      text: `Caja abierta en ${posName(s.point_of_sale_id)}`,
      hint: `Abierta ${relativeTime(s.opened_at)} · falta arqueo`,
    })),
    ...staleOpen.map((s) => ({
      text: `Caja de jornada anterior sin cerrar en ${posName(s.point_of_sale_id)}`,
      hint: `Abierta ${relativeTime(s.opened_at)}`,
    })),
    ...data.incidents
      .filter((i) => i.status !== "resuelto" && sameDay(i.created_at, day))
      .map((i) => ({ text: `Incidente del día sin resolver: ${i.title}`, hint: `Severidad ${i.severity}` })),
  ];

  const cerrados: Item[] = [
    ...data.checklist
      .filter((c: any) => c.phase === "cierre" && c.is_done)
      .map((c: any) => ({
        text: `Checklist de cierre: ${c.label ?? "tarea"}`,
        hint: c.done_at ? `Completada ${relativeTime(c.done_at)}` : "Completada",
      })),
    ...closedToday.map((s) => ({
      text: `Caja ${s.status === "arqueada" ? "arqueada" : "cerrada"} en ${posName(s.point_of_sale_id)}`,
      hint: `Esperado ${formatMoney(num(s.expected_amount), currency)} · Contado ${formatMoney(num(s.counted_amount), currency)} · Diferencia ${formatMoney(num(s.counted_amount) - num(s.expected_amount), currency)}`,
    })),
    ...data.incidents
      .filter((i) => i.status === "resuelto" && sameDay(i.updated_at ?? i.created_at, day))
      .map((i) => ({ text: `Incidente resuelto: ${i.title}`, hint: relativeTime(i.updated_at ?? i.created_at) })),
  ];

  const totalTareas = pendientes.length + cerrados.length;
  const avance = totalTareas ? Math.round((cerrados.length / totalTareas) * 100) : 100;
  const incidentesAbiertosPrevios = data.incidents.filter((i) => i.status !== "resuelto" && !sameDay(i.created_at, day)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div>
          <p className="text-sm font-medium">Sincronización de la jornada</p>
          <p className="text-xs text-muted-foreground">
            {pendingCount > 0
              ? `${formatNumber(pendingCount)} operaciones locales sin subir. Sincronizá antes de cerrar el día.`
              : "Todas las operaciones del día están sincronizadas con la base central."}
          </p>
        </div>
        <SyncDayButton size="sm" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Cierres de caja (esperado)" value={formatMoney(esperadoCaja, currency)} />
        <StatCard label="Contado en cajas" value={formatMoney(contadoCaja, currency)} />
        <StatCard
          label="Diferencia de arqueo"
          value={formatMoney(diferenciaCaja, currency)}
          tone={Math.abs(diferenciaCaja) > 0.5 ? "warning" : "success"}
        />
        <StatCard label="Resultado del día" value={formatMoney(ventas + ingresosTicket - egresos, currency)} tone="success" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ventas registradas" value={formatMoney(ventas, currency)} />
        <StatCard label="Ingresos por ticket" value={formatMoney(ingresosTicket, currency)} />
        <StatCard label="Egresos por ticket" value={formatMoney(egresos, currency)} tone={egresos > 0 ? "warning" : "default"} />
        <StatCard label="Cajas cerradas" value={`${formatNumber(closedToday.length)} / ${formatNumber(todaySessions.length)}`} />
      </div>

      <Panel title="Detalle por punto de venta" hint={`Jornada ${day}`}>
        {detalle.length === 0 ? (
          <EmptyState message="La sede no tiene puntos de venta activos." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Punto de venta</th>
                  <th className="py-2 pr-3 font-medium">Cajas</th>
                  <th className="py-2 pr-3 text-right font-medium">Esperado</th>
                  <th className="py-2 pr-3 text-right font-medium">Contado</th>
                  <th className="py-2 pr-3 text-right font-medium">Diferencia</th>
                  <th className="py-2 pr-3 text-right font-medium">Ventas</th>
                  <th className="py-2 text-right font-medium">Tickets</th>
                </tr>
              </thead>
              <tbody>
                {detalle.map((d) => {
                  const dif = d.contado - d.esperado;
                  return (
                    <tr key={d.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3">{d.name}</td>
                      <td className="py-2 pr-3">
                        <span className="text-muted-foreground">{formatNumber(d.cerradas)} cerradas</span>
                        {d.abiertas > 0 && (
                          <Badge variant="secondary" className="ml-2 text-warning">
                            {formatNumber(d.abiertas)} abierta{d.abiertas > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(d.esperado, currency)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(d.contado, currency)}</td>
                      <td
                        className={
                          Math.abs(dif) > 0.5
                            ? "py-2 pr-3 text-right tabular-nums text-warning"
                            : "py-2 pr-3 text-right tabular-nums text-muted-foreground"
                        }
                      >
                        {formatMoney(dif, currency)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatMoney(d.ventasTotal, currency)}
                        <span className="ml-1 text-xs text-muted-foreground">({formatNumber(d.ventasCount)})</span>
                      </td>
                      <td className="py-2 text-right tabular-nums">{formatMoney(d.ticketsTotal, currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Pendientes para cerrar" hint={`${formatNumber(pendientes.length)} tareas · avance ${avance}%`}>
          {pendientes.length === 0 ? (
            <EmptyState message="El parque está en condiciones de cerrar la jornada." />
          ) : (
            <ul className="space-y-2 text-sm">
              {pendientes.map((p, i) => (
                <li key={`pend-${i}`} className="flex items-start gap-2 rounded-lg border border-border px-3 py-2">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                  <div>
                    <p>{p.text}</p>
                    {p.hint && <p className="text-xs text-muted-foreground">{p.hint}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Ya cerrado" hint={`${formatNumber(cerrados.length)} ítems completados hoy`}>
          {cerrados.length === 0 ? (
            <EmptyState message="Todavía no se completó ningún ítem del cierre." />
          ) : (
            <ul className="space-y-2 text-sm">
              {cerrados.map((c, i) => (
                <li key={`done-${i}`} className="flex items-start gap-2 rounded-lg border border-border px-3 py-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  <div>
                    <p>{c.text}</p>
                    {c.hint && <p className="text-xs text-muted-foreground">{c.hint}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {incidentesAbiertosPrevios > 0 && (
        <p className="text-xs text-muted-foreground">
          Además hay {formatNumber(incidentesAbiertosPrevios)} incidentes abiertos de jornadas anteriores (se gestionan en el
          submenú Incidencias).
        </p>
      )}
    </div>
  );
}
