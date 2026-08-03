import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/ftg/format";

type LedgerLine = {
  debit: number;
  credit: number;
  ledger_accounts: { code: string; name: string; kind: string } | null;
};

type LedgerEntry = {
  id: string;
  entry_date: string;
  description: string | null;
  source_type: string;
  journal_lines: LedgerLine[];
};

type TicketRow = {
  id: string;
  kind: string;
  amount: number;
  tax_amount: number;
  document_number: string | null;
  supplier_name: string | null;
  issued_on: string | null;
  image_path: string;
  created_at: string;
};

/** Libro contable del punto de venta: saldos por cuenta y últimos asientos. */
export function PosLedgerPanel({
  pointOfSaleId,
  currency,
  locale,
}: {
  pointOfSaleId: string;
  currency: string;
  locale: string;
}) {
  const [openingId, setOpeningId] = useState<string | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["pos-ledger", pointOfSaleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select(
          "id, entry_date, description, source_type, journal_lines(debit, credit, ledger_accounts(code, name, account_type))",
        )
        .eq("point_of_sale_id", pointOfSaleId)
        .order("created_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      return (data ?? []) as unknown as LedgerEntry[];
    },
  });

  /** Comprobantes cargados con OCR en este puesto. */
  const { data: tickets = [] } = useQuery({
    queryKey: ["pos-tickets", pointOfSaleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pos_tickets")
        .select("id, kind, amount, tax_amount, document_number, supplier_name, issued_on, image_path, created_at")
        .eq("point_of_sale_id", pointOfSaleId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as TicketRow[];
    },
  });

  async function openTicket(ticket: TicketRow) {
    setOpeningId(ticket.id);
    const { data } = await supabase.storage.from("pos-tickets").createSignedUrl(ticket.image_path, 60 * 10);
    setOpeningId(null);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
  }

  const accounts = useMemo(() => {
    const map = new Map<string, { code: string; name: string; kind: string; debit: number; credit: number }>();
    for (const entry of entries) {
      for (const line of entry.journal_lines ?? []) {
        const account = line.ledger_accounts;
        if (!account) continue;
        const current = map.get(account.code) ?? { ...account, debit: 0, credit: 0 };
        current.debit += Number(line.debit ?? 0);
        current.credit += Number(line.credit ?? 0);
        map.set(account.code, current);
      }
    }
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [entries]);

  const totals = accounts.reduce(
    (acc, a) => ({ debit: acc.debit + a.debit, credit: acc.credit + a.credit }),
    { debit: 0, credit: 0 },
  );

  return (
    <section className="surface-card p-6">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <BookOpen className="h-4 w-4 text-primary" /> Contabilidad del punto de venta
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Partida doble: cada venta, cobro y ticket genera su asiento en esta caja.
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Cargando asientos…</p>
      ) : accounts.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Todavía no hay movimientos contables en este puesto.
        </p>
      ) : (
        <div className="mt-4 space-y-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="pb-2">Cuenta</th>
                  <th className="pb-2 text-right">Debe</th>
                  <th className="pb-2 text-right">Haber</th>
                  <th className="pb-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => {
                  const balance = a.debit - a.credit;
                  return (
                    <tr key={a.code} className="border-t border-border">
                      <td className="py-2">
                        <span className="text-muted-foreground">{a.code}</span> {a.name}
                      </td>
                      <td className="py-2 text-right">{formatMoney(a.debit, currency, locale)}</td>
                      <td className="py-2 text-right">{formatMoney(a.credit, currency, locale)}</td>
                      <td className="py-2 text-right font-medium">
                        {formatMoney(Math.abs(balance), currency, locale)} {balance >= 0 ? "D" : "H"}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t border-border font-semibold">
                  <td className="py-2">Totales</td>
                  <td className="py-2 text-right">{formatMoney(totals.debit, currency, locale)}</td>
                  <td className="py-2 text-right">{formatMoney(totals.credit, currency, locale)}</td>
                  <td className="py-2 text-right">
                    {Math.abs(totals.debit - totals.credit) < 0.01 ? "Balanceado" : "Descuadre"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="text-sm font-medium">Últimos asientos</h3>
            <ul className="mt-2 space-y-2">
              {entries.slice(0, 8).map((entry) => {
                const amount = (entry.journal_lines ?? []).reduce((acc, l) => acc + Number(l.debit ?? 0), 0);
                return (
                  <li key={entry.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{entry.memo ?? entry.source}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.entry_date} · {entry.source}
                      </p>
                    </div>
                    <span className="text-sm font-medium">{formatMoney(amount, currency, locale)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}