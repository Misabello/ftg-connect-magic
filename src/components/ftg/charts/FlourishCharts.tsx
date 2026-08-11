import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/ftg/format";
import { cn } from "@/lib/utils";

export const FLOURISH_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/* ------------------------------------------------------------------ */
/* Bar chart race — la visualización insignia de Flourish              */
/* ------------------------------------------------------------------ */

export type RaceFrame = { label: string; items: { key: string; value: number }[] };

export function BarChartRace({
  frames,
  topN = 8,
  intervalMs = 900,
  valueFormatter = (v: number) => formatNumber(Math.round(v)),
  caption,
}: {
  frames: RaceFrame[];
  topN?: number;
  intervalMs?: number;
  valueFormatter?: (v: number) => string;
  caption?: string;
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playing || frames.length <= 1) return;
    timer.current = setInterval(() => {
      setIndex((i) => {
        if (i >= frames.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, intervalMs);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, frames.length, intervalMs]);

  const frame = frames[Math.min(index, Math.max(frames.length - 1, 0))];
  const colorOf = useMemo(() => {
    const keys = Array.from(new Set(frames.flatMap((f) => f.items.map((i) => i.key)))).sort();
    const map = new Map<string, string>();
    keys.forEach((k, i) => map.set(k, FLOURISH_PALETTE[i % FLOURISH_PALETTE.length]!));
    return map;
  }, [frames]);

  if (!frame) return null;

  const ranked = [...frame.items].sort((a, b) => b.value - a.value).slice(0, topN);
  const max = Math.max(1, ...ranked.map((r) => r.value));
  const rowH = 34;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? "Pausar" : "Reproducir"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5"
            onClick={() => {
              setIndex(0);
              setPlaying(true);
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
          </Button>
        </div>
        <span className="font-mono text-2xl font-semibold tabular-nums text-muted-foreground">{frame.label}</span>
      </div>

      <div className="relative" style={{ height: ranked.length * rowH + 8 }}>
        {ranked.map((item, i) => (
          <div
            key={item.key}
            className="absolute left-0 right-0 flex items-center gap-2 pr-1 transition-all duration-700 ease-out"
            style={{ transform: `translateY(${i * rowH}px)`, height: rowH - 6 }}
          >
            <span className="w-28 shrink-0 truncate text-right text-xs text-muted-foreground sm:w-40">{item.key}</span>
            <div className="relative h-full flex-1 rounded-r-md bg-muted/40">
              <div
                className="h-full rounded-r-md transition-[width] duration-700 ease-out"
                style={{ width: `${Math.max(2, (item.value / max) * 100)}%`, background: colorOf.get(item.key) }}
              />
            </div>
            <span className="w-20 shrink-0 text-right text-xs font-semibold tabular-nums">
              {valueFormatter(item.value)}
            </span>
          </div>
        ))}
      </div>

      <input
        aria-label="Línea de tiempo"
        type="range"
        min={0}
        max={Math.max(frames.length - 1, 0)}
        value={index}
        onChange={(e) => {
          setPlaying(false);
          setIndex(Number(e.target.value));
        }}
        className="w-full accent-[var(--primary)]"
      />
      {caption && <p className="text-[11px] text-muted-foreground">{caption}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Line chart race / story line — reveal progresivo del pronóstico     */
/* ------------------------------------------------------------------ */

export type StoryPoint = {
  label: string;
  historico: number | null;
  estimado: number | null;
  rango: [number, number] | null;
};

export function StoryForecastChart({
  data,
  splitLabel,
  height = 320,
}: {
  data: StoryPoint[];
  splitLabel?: string | null;
  height?: number;
}) {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    setRevealed(0);
    if (data.length === 0) return;
    let frame = 0;
    const step = Math.max(1, Math.ceil(data.length / 60));
    const id = setInterval(() => {
      frame += step;
      setRevealed(frame);
      if (frame >= data.length) clearInterval(id);
    }, 24);
    return () => clearInterval(id);
  }, [data]);

  const shown = data.slice(0, Math.max(revealed, Math.min(2, data.length)));

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={shown} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id="ftg-band" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.32} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.03} />
            </linearGradient>
            <linearGradient id="ftg-hist" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.6} />
              <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 6" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" minTickGap={20} />
          <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" width={64} />
          <Tooltip
            cursor={{ stroke: "var(--primary)", strokeOpacity: 0.35 }}
            contentStyle={{
              background: "var(--popover)",
              color: "var(--popover-foreground)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              fontSize: 12,
            }}
            formatter={(value: any, name: string) =>
              Array.isArray(value)
                ? [`${formatNumber(Number(value[0]))} – ${formatNumber(Number(value[1]))}`, "Rango estimado"]
                : [formatNumber(Number(value ?? 0)), name]
            }
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {splitLabel && (
            <ReferenceLine
              x={splitLabel}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              label={{ value: "hoy", position: "top", fontSize: 10, fill: "var(--muted-foreground)" }}
            />
          )}
          <Area
            type="monotone"
            dataKey="rango"
            name="Rango estimado"
            stroke="none"
            fill="url(#ftg-band)"
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="historico"
            name="Histórico"
            stroke="url(#ftg-hist)"
            strokeWidth={2.5}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="estimado"
            name="Estimado"
            stroke="var(--primary)"
            strokeWidth={3}
            strokeDasharray="6 5"
            dot={false}
            activeDot={{ r: 5 }}
            connectNulls
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Marimekko / stacked share — distribución animada del pronóstico      */
/* ------------------------------------------------------------------ */

export function ShareRibbon({
  segments,
  valueFormatter = (v: number) => formatNumber(Math.round(v)),
}: {
  segments: { key: string; value: number }[];
  valueFormatter?: (v: number) => string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  return (
    <div className="space-y-2">
      <div className="flex h-9 w-full overflow-hidden rounded-lg border border-border">
        {segments.map((s, i) => (
          <div
            key={s.key}
            title={`${s.key}: ${valueFormatter(s.value)}`}
            className={cn("h-full transition-all duration-700 ease-out")}
            style={{ width: `${(s.value / total) * 100}%`, background: FLOURISH_PALETTE[i % FLOURISH_PALETTE.length] }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        {segments.map((s, i) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: FLOURISH_PALETTE[i % FLOURISH_PALETTE.length] }}
            />
            {s.key} · {valueFormatter(s.value)} ({Math.round((s.value / total) * 100)}%)
          </span>
        ))}
      </div>
    </div>
  );
}
