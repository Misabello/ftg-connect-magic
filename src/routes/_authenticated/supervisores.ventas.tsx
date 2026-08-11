import { createFileRoute } from "@tanstack/react-router";

import { StatCard } from "@/components/ftg/StatCard";
import { EmptyState, Loading, Panel } from "@/components/ftg/supervision/SupervisionShell";
import { useScope } from "@/hooks/useScope";
import { useSupervision } from "@/hooks/useSupervision";
import { formatMoney, formatNumber } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/supervisores/ventas")({
  head: () => ({
    meta: [
      { title: "Control de ventas — Supervisores FTG ONE" },
      { name: "description", content: "Ventas del día por punto de venta, producto y descuentos aplicados." },
      { property: "og:title", content: "Control de ventas — Supervisores FTG ONE" },
      { property: "og:description", content: "Detalle de ventas y productos del parque." },
    ],
  }),
  component: ControlVentas,
});

function ControlVentas() {
  const { activeLocationId, activeLocation } = useScope();
  const { data, isLoading } = useSupervision(activeLocationId);
  if (isLoading || !data) return <Loading />;
  const currency = activeLocation?.currency_code ?? "ARS";

  const completed = data.sales.filter((s) => s.status === "completada");
  const total = completed.reduce((a, s) => a + Number(s.total ?? 0), 0);
  const discounts = completed.reduce((a, s) => a + Number(s.discount_total ?? 0), 0);
  const voided = data.sales.filter((s) => s.status === "anulada");
  const devoluciones = data.movements.filter((m: any) => m.kind === "devolucion").length;
  const offlineSales = completed.filter((s) => s.source === "offline");

  const productById = new Map(data.products.map((p) => [p.id, p]));
  const categoryById = new Map(data.categories.map((c: any) => [c.id, c.name as string]));
  const personById = new Map(data.people.map((p: any) => [p.id, p.full_name as string]));

  const bySeller = new Map<string, number>();
  for (const sale of completed) {
    const name = personById.get(sale.sold_by ?? "") ?? "Sin identificar";
    bySeller.set(name, (bySeller.get(name) ?? 0) + Number(sale.total ?? 0));
  }

  const byPos = new Map<string, number>();
  for (const sale of completed) {
    const name = data.pos.find((p) => p.id === sale.point_of_sale_id)?.name ?? "Sin punto de venta";
    byPos.set(name, (byPos.get(name) ?? 0) + Number(sale.total ?? 0));
  }

  const byKind = new Map<string, number>();
  const byCategory = new Map<string, number>();
  for (const item of data.saleItems) {
    const product = productById.get(item.product_id ?? "");
    const kindLabel =
      product?.kind === "fotografia"
        ? "Fotografías"
        : product?.kind === "merchandising"
          ? "Merchandising"
          : product?.kind === "servicio"
            ? "Servicios y recuerdos con IA"
            : "Otros";
    byKind.set(kindLabel, (byKind.get(kindLabel) ?? 0) + Number(item.line_total ?? 0));
    const catName = product?.category_id ? (categoryById.get(product.category_id) ?? "Sin categoría") : "Sin categoría";
    byCategory.set(catName, (byCategory.get(catName) ?? 0) + Number(item.line_total ?? 0));
  }

  const breakdowns = [
    { title: "Ventas por punto de venta", map: byPos },
    { title: "Ventas por vendedor", map: bySeller },
    { title: "Ventas por tipo", map: byKind, hint: "Fotografías, merchandising y recuerdos con IA" },
    { title: "Ventas por categoría", map: byCategory },
  ];

  const byProduct = new Map<string, { name: string; qty: number; total: number }>();
  for (const item of data.saleItems) {
    const key = item.product_id ?? item.description ?? "otros";
    const prev = byProduct.get(key) ?? { name: item.description ?? "Producto", qty: 0, total: 0 };
    prev.qty += Number(item.quantity ?? 0);
    prev.total += Number(item.line_total ?? 0);
    byProduct.set(key, prev);
  }
  const products = [...byProduct.values()].sort((a, b) => b.total - a.total).slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Facturado hoy" value={formatMoney(total, currency)} />
        <StatCard label="Ticket promedio" value={formatMoney(completed.length ? total / completed.length : 0, currency)} />
        <StatCard label="Descuentos" value={formatMoney(discounts, currency)} tone={discounts > 0 ? "warning" : "default"} />
        <StatCard
          label="Anulaciones y devoluciones"
          value={formatNumber(voided.length + devoluciones)}
          hint={`${offlineSales.length} ventas originadas offline`}
          tone={voided.length > 0 ? "danger" : "default"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {breakdowns.map((b) => (
          <Panel key={b.title} title={b.title} {...(b.hint ? { hint: b.hint } : {})}>
            {b.map.size === 0 ? (
              <EmptyState message="Sin datos para el día de hoy." />
            ) : (
              <ul className="divide-y divide-border text-sm">
                {[...b.map.entries()].sort((x, y) => y[1] - x[1]).map(([label, amount]) => (
                  <li key={label} className="flex items-center justify-between py-2">
                    <span>{label}</span>
                    <span className="font-medium">{formatMoney(amount, currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ))}
      </div>

      <Panel title="Productos más vendidos" hint="Top 10 del día por facturación">
        {products.length === 0 ? (
          <EmptyState message="Todavía no hay ventas registradas hoy." />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground uppercase">
              <tr>
                <th className="py-2">Producto</th>
                <th className="text-right">Unidades</th>
                <th className="text-right">Facturado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => (
                <tr key={p.name}>
                  <td className="py-2">{p.name}</td>
                  <td className="text-right">{formatNumber(p.qty)}</td>
                  <td className="text-right font-medium">{formatMoney(p.total, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
