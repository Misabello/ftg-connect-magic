import { RankedBars, ShareRibbon, StorySeriesChart } from "@/components/ftg/charts/FlourishCharts";
import { EmptyState, Panel } from "@/components/ftg/supervision/SupervisionShell";
import { useParkTrends } from "@/hooks/useParkTrends";
import { formatMoney } from "@/lib/ftg/format";

function shortDay(day: string) {
  const d = new Date(`${day}T00:00:00Z`);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", timeZone: "UTC" });
}

function compact(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)} mil`;
  return String(Math.round(value));
}

export function ParkTrendCharts({ locationId, currency }: { locationId: string | null; currency: string }) {
  const { data, isLoading } = useParkTrends(locationId);

  if (isLoading || !data) {
    return (
      <Panel title="Últimos 30 días" hint="Cargando series del parque">
        <EmptyState message="Cargando gráficos…" />
      </Panel>
    );
  }

  const money = (v: number) => formatMoney(v, currency);
  const hasSales = data.totals.ventas > 0;
  const margen = data.totals.ventas - data.totals.costos;

  return (
    <div className="space-y-4">
      <Panel
        title="Ventas de los últimos 30 días"
        hint={`Total ${money(data.totals.ventas)} · ${data.totals.tickets} tickets · ${shortDay(data.from)} a ${shortDay(data.to)}`}
      >
        {!hasSales ? (
          <EmptyState message="No hay ventas registradas en los últimos 30 días." />
        ) : (
          <StorySeriesChart
            data={data.series}
            xKey="day"
            height={256}
            series={[{ key: "ventas", name: "Ventas", color: "var(--primary)" }]}
            valueFormatter={money}
            axisFormatter={(v) => compact(Number(v))}
            labelFormatter={(l) => shortDay(String(l))}
          />
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Ventas por producto" hint="Top 8 por facturación en 30 días">
          {data.products.length === 0 ? (
            <EmptyState message="Sin productos vendidos en el período." />
          ) : (
            <div className="space-y-4">
              <RankedBars
                items={data.products.map((p: any) => ({ key: String(p.name), value: Number(p.monto ?? 0) }))}
                valueFormatter={money}
                topN={8}
              />
              <ShareRibbon
                segments={data.products
                  .slice(0, 5)
                  .map((p: any) => ({ key: String(p.name), value: Number(p.monto ?? 0) }))}
                valueFormatter={money}
              />
            </div>
          )}
        </Panel>

        <Panel
          title="Costos vs ventas"
          hint={`Costos ${money(data.totals.costos)} · Margen ${money(margen)}`}
        >
          {data.totals.costos === 0 && !hasSales ? (
            <EmptyState message="Sin movimientos de costos ni ventas en el período." />
          ) : (
            <StorySeriesChart
              data={data.series}
              xKey="day"
              height={288}
              series={[
                { key: "ventas", name: "Ventas", color: "var(--primary)", type: "line" },
                { key: "costos", name: "Costos", color: "var(--destructive)", type: "line" },
              ]}
              valueFormatter={money}
              axisFormatter={(v) => compact(Number(v))}
              labelFormatter={(l) => shortDay(String(l))}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}