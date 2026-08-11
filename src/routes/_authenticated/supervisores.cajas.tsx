import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ftg/StatCard";
import { EmptyState, Loading, Panel } from "@/components/ftg/supervision/SupervisionShell";
import { useScope } from "@/hooks/useScope";
import { useSupervision } from "@/hooks/useSupervision";
import { formatMoney, formatNumber, relativeTime } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/supervisores/cajas")({
  head: () => ({
    meta: [
      { title: "Control de cajas — Supervisores FTG ONE" },
      { name: "description", content: "Aperturas, cierres y diferencias de caja por punto de venta." },
      { property: "og:title", content: "Control de cajas — Supervisores FTG ONE" },
      { property: "og:description", content: "Arqueos y diferencias de caja del parque." },
    ],
  }),
  component: ControlCajas,
});

function ControlCajas() {
  const { activeLocationId, activeLocation } = useScope();
  const { data, isLoading } = useSupervision(activeLocationId);
  if (isLoading || !data) return <Loading />;
  const currency = activeLocation?.currency_code ?? "ARS";
  const posName = (id: string | null) => data.pos.find((p) => p.id === id)?.name ?? "—";

  const abiertas = data.sessions.filter((s) => s.status === "abierta");
  const pendientesCierre = data.sessions.filter((s) => s.status === "cerrada");
  const conciliadas = data.sessions.filter((s) => s.status === "arqueada");
  const conDiferencia = data.sessions.filter((s) => Math.abs(Number(s.difference_amount ?? 0)) > 0.01);
  const faltantes = conDiferencia
    .filter((s) => Number(s.difference_amount) < 0)
    .reduce((a, s) => a + Number(s.difference_amount ?? 0), 0);
  const sobrantes = conDiferencia
    .filter((s) => Number(s.difference_amount) > 0)
    .reduce((a, s) => a + Number(s.difference_amount ?? 0), 0);
  const sinSincronizar = data.sales.filter((s) => !s.synced_at || s.source === "offline");

  const porMedio = new Map<string, number>();
  for (const pay of data.salePayments) {
    porMedio.set(pay.method_name ?? "Otro", (porMedio.get(pay.method_name ?? "Otro") ?? 0) + Number(pay.amount ?? 0));
  }
  const cobradoTotal = [...porMedio.values()].reduce((a, b) => a + b, 0);
  const facturado = data.sales.filter((s) => s.status === "completada").reduce((a, s) => a + Number(s.total ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Cajas abiertas" value={formatNumber(abiertas.length)} />
        <StatCard
          label="Pendientes de cierre"
          value={formatNumber(pendientesCierre.length)}
          hint={`${formatNumber(conciliadas.length)} conciliadas`}
          tone={pendientesCierre.length > 0 ? "warning" : "default"}
        />
        <StatCard label="Faltantes" value={formatMoney(faltantes, currency)} tone={faltantes < 0 ? "danger" : "default"} />
        <StatCard label="Sobrantes" value={formatMoney(sobrantes, currency)} tone={sobrantes > 0 ? "warning" : "default"} />
      </div>

      <Panel
        title="Cobros por medio de pago"
        hint={`Cobrado ${formatMoney(cobradoTotal, currency)} contra facturado ${formatMoney(facturado, currency)} · diferencia ${formatMoney(cobradoTotal - facturado, currency)}`}
      >
        {porMedio.size === 0 ? (
          <EmptyState message="Sin cobros registrados hoy." />
        ) : (
          <ul className="divide-y divide-border text-sm">
            {[...porMedio.entries()].sort((a, b) => b[1] - a[1]).map(([method, amount]) => (
              <li key={method} className="flex items-center justify-between py-2">
                <span>{method}</span>
                <span className="font-medium">{formatMoney(amount, currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Ventas pendientes de sincronización" hint="Operaciones originadas offline o sin confirmar">
        {sinSincronizar.length === 0 ? (
          <EmptyState message="Todas las ventas del día están sincronizadas." />
        ) : (
          <ul className="divide-y divide-border text-sm">
            {sinSincronizar.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                <span>{posName(s.point_of_sale_id)}</span>
                <span className="text-xs text-muted-foreground">
                  {formatMoney(Number(s.total ?? 0), s.currency_code ?? currency)} · {relativeTime(s.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Cajas abiertas" hint="Sesiones en curso">
        {abiertas.length === 0 ? (
          <EmptyState message="No hay cajas abiertas en este momento." />
        ) : (
          <ul className="divide-y divide-border text-sm">
            {abiertas.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="font-medium">{posName(s.point_of_sale_id)}</span>
                <span className="text-xs text-muted-foreground">
                  Apertura {formatMoney(Number(s.opening_amount ?? 0), s.currency_code ?? currency)} · {relativeTime(s.opened_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Diferencias de arqueo" hint="Sesiones con faltantes o sobrantes">
        {conDiferencia.length === 0 ? (
          <EmptyState message="Sin diferencias registradas." />
        ) : (
          <ul className="divide-y divide-border text-sm">
            {conDiferencia.map((s) => {
              const diff = Number(s.difference_amount ?? 0);
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <p className="font-medium">{posName(s.point_of_sale_id)}</p>
                    <p className="text-xs text-muted-foreground">
                      Esperado {formatMoney(Number(s.expected_amount ?? 0), s.currency_code ?? currency)} · Contado{" "}
                      {formatMoney(Number(s.counted_amount ?? 0), s.currency_code ?? currency)}
                    </p>
                  </div>
                  <Badge variant={diff < 0 ? "destructive" : "secondary"}>
                    {diff > 0 ? "+" : ""}
                    {formatMoney(diff, s.currency_code ?? currency)}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
