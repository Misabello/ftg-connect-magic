import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { periodStart } from "@/lib/ftg/eecc";

export type ReconciliationIssue =
  | "sin_asiento"
  | "importe"
  | "huerfano"
  | "sin_postear";

export const ISSUE_LABEL: Record<ReconciliationIssue, string> = {
  sin_asiento: "Sin asiento contable",
  importe: "Diferencia de importe",
  huerfano: "Asiento sin movimiento",
  sin_postear: "Pendiente de postear",
};

export const ISSUE_HINT: Record<ReconciliationIssue, string> = {
  sin_asiento: "El movimiento de fondos existe pero no encontramos el asiento que lo respalde.",
  importe: "El movimiento y el asiento posteado no coinciden en importe.",
  huerfano: "Hay un asiento posteado cuyo movimiento de fondos ya no existe o fue anulado.",
  sin_postear: "El movimiento está aprobado pero todavía no generó su asiento.",
};

export type ReconciliationRow = {
  key: string;
  date: string;
  origin: string;
  reference: string;
  movement: number;
  posted: number;
  diff: number;
  currency: string;
  issue: ReconciliationIssue;
};

type EntryAgg = { total: number; date: string; sourceType: string; sourceId: string | null };

const round = (n: number) => Math.round(n * 100) / 100;
const day = (value: string | null | undefined) => (value ?? "").slice(0, 10);

const ORIGIN_LABEL: Record<string, string> = {
  sale_payment: "Cobro de venta",
  pos_ticket: "Ticket de caja",
  treasury_memo: "Minuta de tesorería",
};

/** Compara movimientos de fondos contra los asientos posteados en el período. */
export function useFlowReconciliation(days: string, locationId?: string | null) {
  const from = periodStart(days);
  return useQuery({
    queryKey: ["flujo-conciliacion", days, locationId ?? "all"],
    queryFn: async () => {
      const [payments, tickets, memos, entries] = await Promise.all([
        supabase
          .from("sale_payments")
          .select("id, amount, currency_code, method_name, received_at, location_id")
          .gte("received_at", `${from}T00:00:00Z`)
          .limit(3000),
        supabase
          .from("pos_tickets")
          .select("id, amount, currency_code, kind, status, issued_on, document_number, supplier_name, journal_entry_id, location_id")
          .gte("issued_on", from)
          .limit(3000),
        supabase
          .from("treasury_memos")
          .select("id, amount, currency_code, description, memo_type, status, journal_entry_id, posted_at, created_at, location_id")
          .gte("created_at", `${from}T00:00:00Z`)
          .limit(2000),
        supabase
          .from("journal_entries")
          .select("id, entry_date, source_type, source_id, currency_code, location_id, journal_lines(debit)")
          .gte("entry_date", from)
          .in("source_type", ["sale_payment", "pos_ticket", "treasury_memo"])
          .limit(5000),
      ]);
      if (payments.error) throw payments.error;
      if (tickets.error) throw tickets.error;
      if (memos.error) throw memos.error;
      if (entries.error) throw entries.error;

      const inScope = (loc: string | null | undefined) => !locationId || !loc || loc === locationId;

      const bySource = new Map<string, EntryAgg>();
      const usedEntries = new Set<string>();
      for (const e of entries.data ?? []) {
        if (!inScope(e.location_id)) continue;
        const lines = (e as { journal_lines?: { debit: number | null }[] }).journal_lines ?? [];
        const total = round(lines.reduce((acc, l) => acc + Number(l.debit ?? 0), 0));
        const key = `${e.source_type}:${e.source_id ?? e.id}`;
        const current = bySource.get(key);
        bySource.set(key, {
          total: round((current?.total ?? 0) + total),
          date: e.entry_date,
          sourceType: e.source_type ?? "",
          sourceId: e.source_id ?? null,
        });
      }

      const rows: ReconciliationRow[] = [];
      let matched = 0;
      let movementsCount = 0;

      const compare = (opts: {
        key: string;
        sourceType: string;
        sourceId: string;
        date: string;
        reference: string;
        amount: number;
        currency: string;
        pendingPost?: boolean;
      }) => {
        movementsCount += 1;
        const lookup = `${opts.sourceType}:${opts.sourceId}`;
        const entry = bySource.get(lookup);
        if (entry) usedEntries.add(lookup);
        const posted = entry?.total ?? 0;
        const diff = round(opts.amount - posted);
        if (!entry) {
          rows.push({
            key: opts.key,
            date: opts.date,
            origin: ORIGIN_LABEL[opts.sourceType] ?? opts.sourceType,
            reference: opts.reference,
            movement: round(opts.amount),
            posted: 0,
            diff,
            currency: opts.currency,
            issue: opts.pendingPost ? "sin_postear" : "sin_asiento",
          });
          return;
        }
        if (Math.abs(diff) > 0.01) {
          rows.push({
            key: opts.key,
            date: opts.date,
            origin: ORIGIN_LABEL[opts.sourceType] ?? opts.sourceType,
            reference: opts.reference,
            movement: round(opts.amount),
            posted,
            diff,
            currency: opts.currency,
            issue: "importe",
          });
          return;
        }
        matched += 1;
      };

      for (const p of payments.data ?? []) {
        if (!inScope(p.location_id)) continue;
        compare({
          key: `pay-${p.id}`,
          sourceType: "sale_payment",
          sourceId: p.id,
          date: day(p.received_at),
          reference: p.method_name ?? "Cobro",
          amount: Number(p.amount ?? 0),
          currency: p.currency_code ?? "ARS",
        });
      }

      for (const t of tickets.data ?? []) {
        if (!inScope(t.location_id) || t.status !== "confirmado") continue;
        compare({
          key: `tic-${t.id}`,
          sourceType: "pos_ticket",
          sourceId: t.id,
          date: day(t.issued_on),
          reference: [t.document_number, t.supplier_name].filter(Boolean).join(" · ") || `Ticket ${t.kind}`,
          amount: Number(t.amount ?? 0),
          currency: t.currency_code ?? "ARS",
          pendingPost: !t.journal_entry_id,
        });
      }

      for (const m of memos.data ?? []) {
        if (!inScope(m.location_id) || m.status === "anulada" || m.status === "pendiente") continue;
        compare({
          key: `memo-${m.id}`,
          sourceType: "treasury_memo",
          sourceId: m.id,
          date: day(m.posted_at ?? m.created_at),
          reference: m.description ?? m.memo_type ?? "Minuta",
          amount: Number(m.amount ?? 0),
          currency: m.currency_code ?? "ARS",
          pendingPost: !m.journal_entry_id,
        });
      }

      for (const [lookup, entry] of bySource) {
        if (usedEntries.has(lookup)) continue;
        rows.push({
          key: `orph-${lookup}`,
          date: entry.date,
          origin: ORIGIN_LABEL[entry.sourceType] ?? entry.sourceType,
          reference: entry.sourceId ? `Origen ${entry.sourceId.slice(0, 8)}…` : "Sin origen",
          movement: 0,
          posted: entry.total,
          diff: round(-entry.total),
          currency: "ARS",
          issue: "huerfano",
        });
      }

      rows.sort((a, b) => b.date.localeCompare(a.date) || Math.abs(b.diff) - Math.abs(a.diff));

      return {
        rows,
        movementsCount,
        matched,
        entriesCount: bySource.size,
        totalDiff: round(rows.reduce((acc, r) => acc + r.diff, 0)),
      };
    },
  });
}
