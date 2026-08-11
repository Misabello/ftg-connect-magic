import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { EmptyState, Loading, Panel } from "@/components/ftg/supervision/SupervisionShell";
import { useScope } from "@/hooks/useScope";
import { useSupervision } from "@/hooks/useSupervision";
import { formatNumber } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/supervisores/inventario")({
  head: () => ({
    meta: [
      { title: "Control de inventario — Supervisores FTG ONE" },
      { name: "description", content: "Stock disponible, mínimos y faltantes del parque." },
      { property: "og:title", content: "Control de inventario — Supervisores FTG ONE" },
      { property: "og:description", content: "Existencias y alertas de reposición." },
    ],
  }),
  component: ControlInventario,
});

function ControlInventario() {
  const { activeLocationId } = useScope();
  const { data, isLoading } = useSupervision(activeLocationId);
  if (isLoading || !data) return <Loading />;

  const soldPerDay = new Map<string, number>();
  for (const item of data.saleItems) {
    if (!item.product_id) continue;
    soldPerDay.set(item.product_id, (soldPerDay.get(item.product_id) ?? 0) + Number(item.quantity ?? 0));
  }
  const movementsByProduct = new Map<string, number>();
  for (const m of data.movements) {
    if (!m.product_id) continue;
    movementsByProduct.set(m.product_id, (movementsByProduct.get(m.product_id) ?? 0) + Math.abs(Number(m.quantity ?? 0)));
  }
  const transferenciasPendientes = data.movements.filter((m: any) => m.kind === "transferencia").length;

  const rows = data.stock
    .map((s) => {
      const product = data.products.find((p) => p.id === s.product_id);
      const available = Number(s.quantity ?? 0) - Number(s.reserved_quantity ?? 0);
      const min = Number(s.min_quantity ?? 0);
      const dailyDemand = soldPerDay.get(s.product_id ?? "") ?? 0;
      const rotation = movementsByProduct.get(s.product_id ?? "") ?? 0;
      return {
        coverage: dailyDemand > 0 ? available / dailyDemand : null,
        rotation,
        id: s.id,
        name: product?.name ?? "Producto",
        sku: product?.sku ?? "—",
        available,
        min,
        damaged: Number(s.damaged_quantity ?? 0),
        state: available <= 0 ? "sin_stock" : min > 0 && available <= min ? "bajo" : "ok",
      };
    })
    .sort((a, b) => a.available - b.available);

  const criticos = rows.filter((r) => r.state !== "ok");

  return (
    <div className="space-y-4">
      <Panel title="Reposición sugerida" hint="Productos por debajo del mínimo definido">
        {criticos.length === 0 ? (
          <EmptyState message="Todo el inventario está por encima del mínimo." />
        ) : (
          <ul className="divide-y divide-border text-sm">
            {criticos.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.sku} · mínimo {formatNumber(r.min)}</p>
                </div>
                <Badge variant={r.state === "sin_stock" ? "destructive" : "secondary"}>
                  {r.state === "sin_stock" ? "Sin stock" : `Quedan ${formatNumber(r.available)}`}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Existencias"
        hint={`${formatNumber(rows.filter((r) => r.rotation === 0).length)} productos sin movimiento en 30 días · ${formatNumber(transferenciasPendientes)} transferencias registradas`}
      >
        {rows.length === 0 ? (
          <EmptyState message="Sin inventario cargado para este parque." />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground uppercase">
              <tr>
                <th className="py-2">Producto</th>
                <th className="text-right">Disponible</th>
                <th className="text-right">Mínimo</th>
                <th className="text-right">Dañados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="py-2">{r.name}</td>
                  <td className="text-right font-medium">{formatNumber(r.available)}</td>
                  <td className="text-right text-muted-foreground">{formatNumber(r.min)}</td>
                  <td className="text-right text-muted-foreground">{formatNumber(r.rotation)}</td>
                  <td className="text-right text-muted-foreground">
                    {r.coverage === null ? "Sin demanda" : `${r.coverage.toFixed(1)} días`}
                  </td>
                  <td className="text-right text-muted-foreground">{formatNumber(r.damaged)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
