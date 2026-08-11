import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Datos operativos del día para el módulo Supervisores.
 * Reutiliza las tablas existentes: no duplica información ni estructuras.
 */
export function useSupervision(locationId: string | null) {
  const day = todayIso();
  const dayStart = `${day}T00:00:00.000Z`;

  return useQuery({
    queryKey: ["supervision", locationId, day],
    enabled: !!locationId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const loc = locationId!;
      const [
        pos,
        devices,
        sessions,
        sales,
        tickets,
        stock,
        products,
        incidents,
        operationDay,
        photos,
      ] = await Promise.all([
        supabase.from("points_of_sale").select("*").eq("location_id", loc).eq("is_active", true).order("name"),
        supabase.from("devices").select("*").eq("location_id", loc),
        supabase.from("cash_sessions").select("*").eq("location_id", loc).order("opened_at", { ascending: false }).limit(100),
        supabase
          .from("sales")
          .select("id, point_of_sale_id, sold_by, total, subtotal, discount_total, currency_code, status, source, created_at, synced_at, cash_session_id")
          .eq("location_id", loc)
          .gte("created_at", dayStart),
        supabase.from("pos_tickets").select("*").eq("location_id", loc).gte("issued_on", day),
        supabase.from("stock_levels").select("*").eq("location_id", loc),
        supabase.from("products").select("id, name, sku, kind, category_id, cost, is_active"),
        supabase
          .from("operation_incidents")
          .select("*")
          .eq("location_id", loc)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("operation_days").select("*").eq("location_id", loc).eq("day", day).maybeSingle(),
        supabase.from("photos").select("id, status, point_of_sale_id, captured_at").eq("location_id", loc).gte("captured_at", dayStart),
      ]);

      const opDay = operationDay.data;
      const [checklist, staff, saleItems] = await Promise.all([
        opDay
          ? supabase.from("operation_checklist_items").select("*").eq("operation_day_id", opDay.id).order("created_at")
          : Promise.resolve({ data: [] as any[] }),
        opDay
          ? supabase.from("operation_staff").select("*").eq("operation_day_id", opDay.id)
          : Promise.resolve({ data: [] as any[] }),
        (sales.data ?? []).length > 0
          ? supabase
              .from("sale_items")
              .select("sale_id, product_id, description, quantity, line_total, discount_amount")
              .in("sale_id", (sales.data ?? []).map((s) => s.id))
          : Promise.resolve({ data: [] as any[] }),
      ]);

      return {
        day,
        pos: pos.data ?? [],
        devices: devices.data ?? [],
        sessions: sessions.data ?? [],
        sales: sales.data ?? [],
        saleItems: (saleItems.data ?? []) as any[],
        tickets: tickets.data ?? [],
        stock: stock.data ?? [],
        products: products.data ?? [],
        incidents: incidents.data ?? [],
        operationDay: opDay ?? null,
        checklist: (checklist.data ?? []) as any[],
        staff: (staff.data ?? []) as any[],
        photos: photos.data ?? [],
      };
    },
  });
}

export type SupervisionData = NonNullable<ReturnType<typeof useSupervision>["data"]>;

/** Milisegundos desde la última sincronización de un dispositivo. */
export function isOffline(lastSyncAt: string | null | undefined, thresholdMinutes = 15) {
  if (!lastSyncAt) return true;
  return Date.now() - new Date(lastSyncAt).getTime() > thresholdMinutes * 60_000;
}
