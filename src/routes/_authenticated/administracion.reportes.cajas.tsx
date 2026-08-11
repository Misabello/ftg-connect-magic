import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, relativeTime } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/administracion/reportes/cajas")({
  component: CajasReport,
});

function CajasReport() {
  const { data } = useQuery({
    queryKey: ["admin-cash-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_sessions")
        .select(
          "id, status, currency_code, opening_amount, expected_amount, counted_amount, difference_amount, opened_at, closed_at, points_of_sale(name)",
        )
        .order("opened_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <section className="surface-card p-5">
      <h2 className="text-base font-semibold">Arqueos y cajas recientes</h2>
      <ul className="mt-4 space-y-2">
        {(data ?? []).length === 0 && (
          <li className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No hay turnos de caja registrados.
          </li>
        )}
        {(data ?? []).map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface p-4 text-sm">
            <div>
              <p className="font-medium">{s.points_of_sale?.name ?? "Punto de venta"}</p>
              <p className="text-xs text-muted-foreground">
                Apertura {relativeTime(s.opened_at)}
                {s.closed_at ? ` · cierre ${relativeTime(s.closed_at)}` : " · turno abierto"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">
                Esperado {formatMoney(Number(s.expected_amount ?? 0), s.currency_code)} · Contado{" "}
                {formatMoney(Number(s.counted_amount ?? 0), s.currency_code)}
              </span>
              <Badge variant={Number(s.difference_amount ?? 0) === 0 ? "secondary" : "destructive"}>
                {s.status === "abierta"
                  ? "Abierta"
                  : `Diferencia ${formatMoney(Number(s.difference_amount ?? 0), s.currency_code)}`}
              </Badge>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
