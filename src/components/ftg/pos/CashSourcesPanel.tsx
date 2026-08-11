import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Landmark, Wallet } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/ftg/format";

type PaymentRow = {
  amount: number;
  method_name: string;
  cash_sources: { id: string; name: string; fund_kind: string; provider: string | null } | null;
};

type IntentRow = { amount: number; status: string };

/** Origen de fondos del puesto: cuánto ingresó por cada fuente de caja (efectivo, Mercado Pago, banco…). */
export function CashSourcesPanel({
  pointOfSaleId,
  locationName,
  posName,
  currency,
  locale,
}: {
  pointOfSaleId: string;
  locationName: string | null;
  posName: string;
  currency: string;
  locale: string;
}) {
  const { data: payments = [] } = useQuery({
    queryKey: ["pos-cash-sources", pointOfSaleId],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sale_payments")
        .select("amount, method_name, cash_sources(id, name, fund_kind, provider)")
        .eq("point_of_sale_id", pointOfSaleId)
        .order("received_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as PaymentRow[];
    },
  });

  const { data: intents = [] } = useQuery({
    queryKey: ["pos-mp-intents", pointOfSaleId],
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_intents")
        .select("amount, status")
        .eq("point_of_sale_id", pointOfSaleId)
        .limit(200);
      if (error) throw error;
      return (data ?? []) as IntentRow[];
    },
  });

  const rows = useMemo(() => {
    const map = new Map<string, { name: string; kind: string; total: number; count: number }>();
    for (const p of payments) {
      const key = p.cash_sources?.id ?? `sin-fuente-${p.method_name}`;
      const current =
        map.get(key) ??
        {
          name: p.cash_sources?.name ?? `${p.method_name} (sin fuente asignada)`,
          kind: p.cash_sources?.fund_kind ?? "otro",
          total: 0,
          count: 0,
        };
      current.total += Number(p.amount ?? 0);
      current.count += 1;
      map.set(key, current);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [payments]);

  const total = rows.reduce((acc, r) => acc + r.total, 0);
  const mpApproved = intents
    .filter((i) => i.status === "aprobado")
    .reduce((acc, i) => acc + Number(i.amount ?? 0), 0);
  const mpPending = intents
    .filter((i) => i.status === "pendiente")
    .reduce((acc, i) => acc + Number(i.amount ?? 0), 0);

  return (
    <section className="surface-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Wallet className="h-4 w-4 text-primary" /> Origen de fondos
        </h2>
        <p className="text-xs text-muted-foreground">
          {posName}
          {locationName ? ` · ${locationName}` : ""}
        </p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Cada cobro se asigna automáticamente a una fuente de caja según el medio de pago, este puesto y su sede.
      </p>

      <ul className="mt-4 space-y-2">
        {rows.length === 0 && (
          <li className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Todavía no hay cobros asignados a fuentes de caja en este puesto.
          </li>
        )}
        {rows.map((r) => (
          <li key={r.name} className="flex items-center justify-between gap-3 rounded-xl bg-surface p-4">
            <div>
              <p className="text-sm font-medium">{r.name}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {r.kind} · {r.count} cobro{r.count === 1 ? "" : "s"}
              </p>
            </div>
            <p className="text-sm font-semibold">{formatMoney(r.total, currency, locale)}</p>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <Landmark className="h-4 w-4" /> Mercado Pago: {formatMoney(mpApproved, currency, locale)} aprobado
          {mpPending > 0 ? ` · ${formatMoney(mpPending, currency, locale)} pendiente` : ""}
        </span>
        <span className="font-semibold">Total cobrado: {formatMoney(total, currency, locale)}</span>
      </div>
    </section>
  );
}
