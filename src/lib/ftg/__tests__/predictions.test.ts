import { describe, expect, it } from "vitest";

import {
  INSUFFICIENT_DATA_MESSAGE,
  daysBetween,
  evaluateSufficiency,
  historyRange,
  horizonRange,
} from "@/lib/ftg/predictions";

describe("horizonRange", () => {
  it("devuelve una ventana futura que arranca mañana", () => {
    const base = new Date("2026-01-10T12:00:00Z");
    expect(horizonRange("7d", base)).toEqual({ from: "2026-01-11", to: "2026-01-17" });
  });

  it("devuelve null para el período personalizado", () => {
    expect(horizonRange("custom")).toBeNull();
  });
});

describe("historyRange", () => {
  it("usa al menos cuatro veces el horizonte solicitado", () => {
    const base = new Date("2026-01-10T12:00:00Z");
    const range = historyRange(60, 30, base);
    expect(range.span).toBe(120);
    expect(daysBetween(range.from, range.to)).toBe(120);
  });

  it("respeta el mínimo histórico del objetivo", () => {
    expect(historyRange(180, 7, new Date("2026-01-10T12:00:00Z")).span).toBe(180);
  });
});

describe("evaluateSufficiency", () => {
  const base = { minObservations: 30, minHistoryDays: 60 };

  it("rechaza cuando no hay movimientos", () => {
    const res = evaluateSufficiency({ observations: 0, distinctDays: 0, ...base });
    expect(res.ok).toBe(false);
    expect(res.reason).toContain(INSUFFICIENT_DATA_MESSAGE);
  });

  it("rechaza cuando faltan registros", () => {
    expect(evaluateSufficiency({ observations: 12, distinctDays: 40, ...base }).ok).toBe(false);
  });

  it("rechaza cuando hay pocos días con actividad", () => {
    expect(evaluateSufficiency({ observations: 200, distinctDays: 9, ...base }).ok).toBe(false);
  });

  it("acepta cuando hay histórico suficiente", () => {
    const res = evaluateSufficiency({ observations: 200, distinctDays: 45, ...base });
    expect(res.ok).toBe(true);
    expect(res.reason).toBeNull();
  });
});
