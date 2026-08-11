import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { StatCard } from "@/components/ftg/StatCard";
import { EmptyState, Loading, Panel } from "@/components/ftg/supervision/SupervisionShell";
import { useScope } from "@/hooks/useScope";
import { useSupervision } from "@/hooks/useSupervision";
import { formatMoney, formatNumber, relativeTime } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/supervisores/cierre")({
  head: () => ({
    meta: [
      { title: "Cierre diario — Supervisores FTG ONE" },
      { name: "description", content: "Resumen de cierre del día: ventas, tickets de gasto y tareas pendientes." },
      { property: "og:title", content: "Cierre diario — Supervisores FTG ONE" },
      { property: "og:description", content: "Checklist y balance del cierre del parque." },
    ],
  }),
  component: CierreDiario,
});

function CierreDiario() {
  const { activeLocationId, activeLocation } = useScope();
  const { data, isLoading } = useSupervision(activeLocationId);
  if (isLoading || !data) return <Loading />;
  const currency = activeLocation?.currency_code ?? "ARS";

  const ventas = data.sales.filter((s) => s.status === "completada").reduce((a, s) => a + Number(s.total ?? 0), 0);
  const egresos = data.tickets
    .filter((t: any) => t.kind !== "ingreso")
    .reduce((a: number, t: any) => a + Number(t.amount ?? 0), 0);
  const ingresosTicket = data.tickets
    .filter((t: any) => t.kind === "ingreso")
    .reduce((a: number, t: any) => a + Number(t.amount ?? 0), 0);

  const posName = (id: string | null) => data.pos.find((p) => p.id === id)?.name ?? "Punto de venta";
  const today = new Date().toISOString().slice(0, 10);
  const isToday = (value?: string | null) => !!value && String(value).slice(0, 10) === today;

  type Item = { text: string; hint?: string };

  const pendientes: Item[] = [
    ...data.checklist
      .filter((c: any) => c.phase === "cierre" && !c.is_done)
      .map((c: any) => ({ text: `Checklist de cierre: ${c.label ?? c.title ?? "tarea"}`, hint: c.is_required ? "Obligatoria" : "Opcional" })),
    ...data.sessions
      .filter((s) => s.status === "abierta")
      .map((s) => ({ text: `Caja abierta en ${posName(s.point_of_sale_id)}`, hint: `Abierta ${relativeTime(s.opened_at)}` })),
    ...data.incidents
      .filter((i) => i.status !== "resuelto")
      .map((i) => ({ text: `Incidente sin resolver: ${i.title}`, hint: `Severidad ${i.severity}` })),
  ];

  const cerrados: Item[] = [
    ...data.checklist
      .filter((c: any) => c.phase === "cierre" && c.is_done)
      .map((c: any) => ({ text: `Checklist de cierre: ${c.label ?? c.title ?? "tarea"}`, hint: c.done_at ? `Completada ${relativeTime(c.done_at)}` : "Completada" })),
    ...data.sessions
      .filter((s) => s.status !== "abierta" && isToday(s.closed_at ?? s.opened_at))
      .map((s) => ({
        text: `Caja ${s.status === "arqueada" ? "arqueada" : "cerrada"} en ${posName(s.point_of_sale_id)}`,
        hint: `Contado ${formatMoney(Number(s.counted_amount ?? 0), currency)} · Diferencia ${formatMoney(Number(s.difference_amount ?? 0), currency)}`,
      })),
    ...data.incidents
      .filter((i) => i.status === "resuelto" && isToday(i.updated_at ?? i.created_at))
      .map((i) => ({ text: `Incidente resuelto: ${i.title}`, hint: relativeTime(i.updated_at ?? i.created_at) })),
  ];

  const totalTareas = pendientes.length + cerrados.length;
  const avance = totalTareas ? Math.round((cerrados.length / totalTareas) * 100) : 100;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ventas del día" value={formatMoney(ventas, currency)} />
        <StatCard label="Ingresos por ticket" value={formatMoney(ingresosTicket, currency)} />
        <StatCard label="Egresos por ticket" value={formatMoney(egresos, currency)} tone={egresos > 0 ? "warning" : "default"} />
        <StatCard label="Resultado del día" value={formatMoney(ventas + ingresosTicket - egresos, currency)} tone="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Pendientes para cerrar"
          hint={`${formatNumber(pendientes.length)} tareas · avance ${avance}%`}
        >
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
    </div>
  );
}
