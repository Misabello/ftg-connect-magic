import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const DAYS = 30;

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Serie de los últimos 30 días: ventas generales, ventas por producto y costos. */
export function useParkTrends(locationId: string | null) {
  const from = new Date(Date.now() - (DAYS - 1) * 86_400_000);
  const fromDay = isoDay(from);

  return useQuery({
    queryKey: ["park-trends", locationId, fromDay],
    enabled: !!locationId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const loc = locationId!;
      const [salesRes, costsRes, productsRes] = await Promise.all([
        supabase
          .from("sales")
          .select("id, total, status, created_at")
          .eq("location_id", loc)
          .eq("status", "completada")
          .gte("created_at", `${fromDay}T00:00:00.000Z`),
        supabase
          .from("finance_documents")
          .select("amount, issued_on, kind, concept")
          .eq("location_id", loc)
          .eq("kind", "pagar")
          .gte("issued_on", fromDay),
        supabase.from("products").select("id, name"),
      ]);

      const sales = salesRes.data ?? [];
      const saleIds = sales.map((s) => s.id);
      const itemsRes = saleIds.length
        ? await supabase
            .from("sale_items")
            .select("sale_id, product_id, description, quantity, line_total")
            .in("sale_id", saleIds)
        : { data: [] as any[] };

      const productName = new Map((productsRes.data ?? []).map((p) => [p.id, p.name]));

      // Serie diaria completa (incluye días sin movimiento).
      const daily = new Map<string, { day: string; ventas: number; costos: number; tickets: number }>();
      for (let i = 0; i < DAYS; i += 1) {
        const key = isoDay(new Date(from.getTime() + i * 86_400_000));
        daily.set(key, { day: key, ventas: 0, costos: 0, tickets: 0 });
      }
      for (const s of sales) {
        const key = String(s.created_at).slice(0, 10);
        const row = daily.get(key);
        if (!row) continue;
        row.ventas += Number(s.total ?? 0);
        row.tickets += 1;
      }
      for (const c of costsRes.data ?? []) {
        const row = daily.get(String(c.issued_on).slice(0, 10));
        if (row) row.costos += Number(c.amount ?? 0);
      }

      const byProduct = new Map<string, { name: string; monto: number; unidades: number }>();
      for (const it of (itemsRes.data ?? []) as any[]) {
        const name = (it.product_id ? productName.get(it.product_id) : null) ?? it.description ?? "Sin producto";
        const entry = byProduct.get(name) ?? { name, monto: 0, unidades: 0 };
        entry.monto += Number(it.line_total ?? 0);
        entry.unidades += Number(it.quantity ?? 0);
        byProduct.set(name, entry);
      }

      const series = [...daily.values()];
      return {
        from: fromDay,
        to: isoDay(new Date()),
        series,
        products: [...byProduct.values()].sort((a, b) => b.monto - a.monto).slice(0, 8),
        totals: {
          ventas: series.reduce((a, r) => a + r.ventas, 0),
          costos: series.reduce((a, r) => a + r.costos, 0),
          tickets: series.reduce((a, r) => a + r.tickets, 0),
        },
      };
    },
  });
}