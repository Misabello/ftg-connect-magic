import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowDownCircle, ArrowUpCircle, BookOpen, ClipboardList } from "lucide-react";

import { StatCard } from "@/components/ftg/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/administracion/")({
  head: () => ({
    meta: [
      { title: "Resumen de administración — FTG ONE" },
      { name: "description", content: "Indicadores de cuentas a cobrar, a pagar, minutas y asientos contables." },
      { property: "og:title", content: "Resumen de administración — FTG ONE" },
      { property: "og:description", content: "Indicadores administrativos y contables de FTG ONE." },
    ],
  }),
  component: AdministracionResumen,
});

const SHORTCUTS = [
  { to: "/administracion/cobrar", label: "Ctas a Cobrar", desc: "Documentos emitidos a clientes." },
  { to: "/administracion/pagar", label: "Ctas a Pagar", desc: "Facturas de proveedores y pagos." },
  { to: "/administracion/minutas", label: "Minutas", desc: "Movimientos de tesorería a aprobar." },
  { to: "/administracion/asientos", label: "Asientos contables", desc: "Libro diario y cierres de caja." },
  { to: "/administracion/reportes", label: "Reportes", desc: "Ventas, cajas, inventario y comprobantes." },
  { to: "/administracion/eecc", label: "EECC", desc: "Sumas y saldos, resultados y flujo de fondos." },
] as const;

function AdministracionResumen() {
  const { data } = useQuery({
    queryKey: ["admin-summary"],
    queryFn: async () => {
      const [docs, memos, entries] = await Promise.all([
        supabase.from("finance_documents").select("kind, status, amount, paid_amount, due_on, currency_code"),
        supabase.from("treasury_memos").select("id, status"),
        supabase.from("journal_entries").select("id").limit(1000),
      ]);
      if (docs.error) throw docs.error;
      const open = (docs.data ?? []).filter((d) => d.status !== "pagado" && d.status !== "anulado");
      const pending = (kind: string) =>
        open
          .filter((d) => d.kind === kind)
          .reduce((acc, d) => acc + (Number(d.amount ?? 0) - Number(d.paid_amount ?? 0)), 0);
      const today = new Date().toISOString().slice(0, 10);
      return {
        currency: (docs.data ?? [])[0]?.currency_code ?? "ARS",
        receivable: pending("cobrar"),
        payable: pending("pagar"),
        overdue: open.filter((d) => d.due_on && d.due_on < today).length,
        memosPending: (memos.data ?? []).filter((m) => m.status === "pendiente").length,
        entries: (entries.data ?? []).length,
      };
    },
  });

  const currency = data?.currency ?? "ARS";

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="A cobrar pendiente"
          value={formatMoney(data?.receivable ?? 0, currency)}
          hint={`${data?.overdue ?? 0} documentos vencidos`}
          icon={ArrowDownCircle}
          tone="success"
        />
        <StatCard
          label="A pagar pendiente"
          value={formatMoney(data?.payable ?? 0, currency)}
          hint="Facturas de proveedores abiertas"
          icon={ArrowUpCircle}
          tone="warning"
        />
        <StatCard
          label="Minutas por aprobar"
          value={String(data?.memosPending ?? 0)}
          hint="Tesorería pendiente de posteo"
          icon={ClipboardList}
        />
        <StatCard
          label="Asientos registrados"
          value={String(data?.entries ?? 0)}
          hint="Libro diario (últimos 1000)"
          icon={BookOpen}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {SHORTCUTS.map((s) => (
          <Link key={s.to} to={s.to} className="surface-card p-4 transition-colors hover:bg-surface">
            <p className="text-sm font-semibold">{s.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
