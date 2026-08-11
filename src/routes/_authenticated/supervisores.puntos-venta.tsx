import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Loading, Panel } from "@/components/ftg/supervision/SupervisionShell";
import { useScope } from "@/hooks/useScope";
import { isOffline, useSupervision } from "@/hooks/useSupervision";
import { formatMoney, formatNumber, relativeTime } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/supervisores/puntos-venta")({
  head: () => ({
    meta: [
      { title: "Control de puntos de venta — Supervisores FTG ONE" },
      { name: "description", content: "Estado, sincronización y ventas de cada punto de venta del parque." },
      { property: "og:title", content: "Control de puntos de venta — Supervisores FTG ONE" },
      { property: "og:description", content: "Seguimiento por punto de venta en tiempo real." },
    ],
  }),
  component: ControlPuntosVenta,
});

function ControlPuntosVenta() {
  const { activeLocationId, activeLocation } = useScope();
  const { data, isLoading } = useSupervision(activeLocationId);
  if (isLoading || !data) return <Loading />;
  const currency = activeLocation?.currency_code ?? "ARS";

  const target = Number(data.operationDay?.sales_target ?? 0);
  const perPosTarget = data.pos.length > 0 ? target / data.pos.length : 0;
  const criticalStock = data.stock.filter((st) => {
    const available = Number(st.quantity ?? 0) - Number(st.reserved_quantity ?? 0);
    return available <= 0 || (Number(st.min_quantity ?? 0) > 0 && available <= Number(st.min_quantity ?? 0));
  }).length;

  const rows = data.pos.map((p) => {
    const sales = data.sales.filter((s) => s.point_of_sale_id === p.id && s.status === "completada");
    const device = data.devices.find((d) => d.point_of_sale_id === p.id);
    const session = data.sessions.find((s) => s.point_of_sale_id === p.id && s.status === "abierta");
    return {
      pos: p,
      device,
      session,
      total: sales.reduce((a, s) => a + Number(s.total ?? 0), 0),
      tickets: sales.length,
      pending: Number(device?.pending_operations ?? 0),
      offline: isOffline(device?.last_sync_at),
      lastSale: sales.map((s) => s.created_at).sort().at(-1) ?? null,
      alerts: data.incidents.filter((i) => i.point_of_sale_id === p.id && i.status !== "resuelto").length,
    };
  });

  return (
    <Panel
      title="Puntos de venta"
      hint={`Ventas del día, caja y sincronización · objetivo del parque ${target ? formatMoney(target, currency) : "sin definir"} · ${formatNumber(criticalStock)} productos con stock crítico`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground uppercase">
            <tr>
              <th className="py-2">Punto de venta</th>
              <th>Caja</th>
              <th>Dispositivo</th>
              <th className="text-right">Tickets</th>
              <th className="text-right">Ticket prom.</th>
              <th className="text-right">Ventas</th>
              <th className="text-right">Cumplimiento</th>
              <th>Última venta</th>
              <th className="text-right">Alertas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.pos.id}>
                <td className="py-2.5">
                  <p className="font-medium">{r.pos.name}</p>
                  <p className="text-xs text-muted-foreground">{r.pos.code} · {r.pos.pos_type}</p>
                </td>
                <td>
                  <Badge variant={r.session ? "default" : "secondary"}>{r.session ? "Abierta" : "Cerrada"}</Badge>
                </td>
                <td>
                  {r.device ? (
                    <div className="text-xs">
                      <Badge variant={r.offline ? "destructive" : "secondary"}>{r.offline ? "Offline" : "En línea"}</Badge>
                      <p className="mt-1 text-muted-foreground">
                        {relativeTime(r.device.last_sync_at)} · {formatNumber(r.pending)} pendientes
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin dispositivo</span>
                  )}
                </td>
                <td className="text-right">{formatNumber(r.tickets)}</td>
                <td className="text-right">{formatMoney(r.tickets ? r.total / r.tickets : 0, currency)}</td>
                <td className="text-right font-medium">{formatMoney(r.total, currency)}</td>
                <td className="text-right">
                  {perPosTarget > 0 ? `${Math.round((r.total / perPosTarget) * 100)}%` : "Sin objetivo"}
                </td>
                <td className="text-xs text-muted-foreground">{r.lastSale ? relativeTime(r.lastSale) : "Sin ventas"}</td>
                <td className="text-right">
                  {r.alerts > 0 ? <Badge variant="destructive">{r.alerts}</Badge> : <span className="text-muted-foreground">0</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
