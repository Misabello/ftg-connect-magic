import { describe, expect, it } from "vitest";
import { fillDaily, bucketize, fitSeries, backtest, futureBuckets } from "@/lib/ftg/predictions.engine";
describe("engine", () => {
  it("forecasts a seasonal series", () => {
    const pts = Array.from({ length: 120 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString().slice(0, 10);
      const dow = new Date(d).getUTCDay();
      return { date: d, value: 1000 + i * 5 + (dow === 0 || dow === 6 ? 800 : 0) };
    });
    const daily = fillDaily(pts, pts[0]!.date, pts[pts.length - 1]!.date);
    const b = bucketize(daily, "diario");
    expect(b.length).toBe(120);
    const fit = fitSeries(b.map((x) => x.value), "diario");
    const f = fit.forecast(14);
    expect(f.length).toBe(14);
    expect(f.every((x) => x.value > 500 && x.upper >= x.value && x.lower <= x.value)).toBe(true);
    const m = backtest(b.map((x) => x.value), "diario", 14);
    expect(m).not.toBeNull();
    expect(m!.mae).toBeLessThan(900);
    expect(futureBuckets("2026-05-01", "2026-05-30", "semanal").length).toBeGreaterThan(3);
  });
});
