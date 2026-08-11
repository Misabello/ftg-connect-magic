import { createFileRoute } from "@tanstack/react-router";

import { StatCard } from "@/components/ftg/StatCard";
import { EmptyState, Loading, Panel } from "@/components/ftg/supervision/SupervisionShell";
import { useScope } from "@/hooks/useScope";
import { useSupervision } from "@/hooks/useSupervision";
import { formatMoney, formatNumber } from "@/lib/ftg/format";

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

  const pendientes = [
    ...data.checklist.filter((c: any) => c.phase === "cierre" && !c.is_done).map((c: any) => c.title),
    ...data.sessions.filter((s) => s.status === "abierta").map((s) => `Caja abierta en ${data.pos.find((p) => p.id === s.point_of_sale_id)?.name ?? "punto de venta"}`),
    ...data.incidents.filter((i) => i.status !== "resuelto").map((i) => `Incidente sin resolver: ${i.title}`),
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ventas del día" value={formatMoney(ventas, currency)} />
        <StatCard label="Ingresos por ticket" value={formatMoney(ingresosTicket, currency)} />
        <StatCard label="Egresos por ticket" value={formatMoney(egresos, currency)} tone={egresos > 0 ? "warning" : "default"} />
        <StatCard label="Resultado del día" value={formatMoney(ventas + ingresosTicket - egresos, currency)} tone="success" />
      </div>

      <Panel title="Pendientes para cerrar" hint={`${formatNumber(pendientes.length)} tareas`}>
        {pendientes.length === 0 ? (
          <EmptyState message="El parque está en condiciones de cerrar la jornada." />
        ) : (
          <ul className="space-y-2 text-sm">
            {pendientes.map((p, i) => (
              <li key={`${p}-${i}`} className="rounded-lg border border-border px-3 py-2">
                {p}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
