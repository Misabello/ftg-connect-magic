import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { EmptyState, Loading, Panel } from "@/components/ftg/supervision/SupervisionShell";
import { useScope } from "@/hooks/useScope";
import { useSupervision } from "@/hooks/useSupervision";
import { formatMoney, relativeTime } from "@/lib/ftg/format";

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
  const conDiferencia = data.sessions.filter((s) => Math.abs(Number(s.difference_amount ?? 0)) > 0.01);

  return (
    <div className="space-y-4">
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
