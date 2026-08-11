import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  const tooltipStyle = {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 12,
  } as const;

  return (
    <div className="space-y-4">
      <Panel
        title="Ventas de los últimos 30 días"
        hint={`Total ${money(data.totals.ventas)} · ${data.totals.tickets} tickets · ${shortDay(data.from)} a ${shortDay(data.to)}`}
      >
        {!hasSales ? (
          <EmptyState message="No hay ventas registradas en los últimos 30 días." />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ventasFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tickFormatter={shortDay} minTickGap={24} tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} width={64} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(l) => shortDay(String(l))}
                  formatter={(v: number, n) => [n === "tickets" ? String(v) : money(Number(v)), n === "tickets" ? "Tickets" : "Ventas"]}
                />
                <Area type="monotone" dataKey="ventas" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#ventasFill)" name="ventas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Ventas por producto" hint="Top 8 por facturación en 30 días">
          {data.products.length === 0 ? (
            <EmptyState message="Sin productos vendidos en el período." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.products} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number, n) => [n === "unidades" ? String(v) : money(Number(v)), n === "unidades" ? "Unidades" : "Facturado"]}
                  />
                  <Bar dataKey="monto" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="monto" />
                </BarChart>
              </ResponsiveContainer>
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
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tickFormatter={shortDay} minTickGap={24} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} width={64} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => shortDay(String(l))} formatter={(v: number) => money(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="ventas" name="Ventas" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="costos" name="Costos" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}