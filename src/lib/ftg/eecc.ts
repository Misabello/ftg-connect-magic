import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type LedgerLine = {
  id: string;
  debit: number;
  credit: number;
  description: string | null;
  account: { code: string; name: string; account_type: string; normal_side: string; sort_order: number } | null;
  entry: {
    id: string;
    entry_date: string;
    description: string;
    currency_code: string;
    location_id: string | null;
    source_type: string;
  } | null;
};

export const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  activo: "Activo",
  pasivo: "Pasivo",
  patrimonio: "Patrimonio neto",
  ingreso: "Ingresos",
  egreso: "Egresos",
  gasto: "Gastos",
  costo: "Costos",
};

export const PERIOD_OPTIONS = [
  { value: "30", label: "Últimos 30 días" },
  { value: "90", label: "Últimos 90 días" },
  { value: "180", label: "Últimos 6 meses" },
  { value: "365", label: "Últimos 12 meses" },
];

export function periodStart(days: string) {
  return new Date(Date.now() - Number(days) * 86_400_000).toISOString().slice(0, 10);
}

export function useLedgerLines(days: string, locationId?: string | null) {
  const from = periodStart(days);
  return useQuery({
    queryKey: ["eecc-lines", days, locationId ?? "all"],
    queryFn: async (): Promise<LedgerLine[]> => {
      const { data, error } = await supabase
        .from("journal_lines")
        .select(
          "id, debit, credit, description, ledger_accounts(code, name, account_type, normal_side, sort_order), journal_entries!inner(id, entry_date, description, currency_code, location_id, source_type)",
        )
        .gte("journal_entries.entry_date", from)
        .order("created_at", { ascending: false })
        .limit(4000);
      if (error) throw error;
      return (data ?? [])
        .map((l) => ({
          id: l.id,
          debit: Number(l.debit ?? 0),
          credit: Number(l.credit ?? 0),
          description: l.description,
          account: (l as { ledger_accounts?: LedgerLine["account"] }).ledger_accounts ?? null,
          entry: (l as { journal_entries?: LedgerLine["entry"] }).journal_entries ?? null,
        }))
        .filter((l) => !locationId || !l.entry?.location_id || l.entry.location_id === locationId);
    },
  });
}

export type AccountBalance = {
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
};

export function accountBalances(lines: LedgerLine[]): AccountBalance[] {
  const map = new Map<string, AccountBalance>();
  for (const line of lines) {
    const acc = line.account;
    if (!acc) continue;
    const current = map.get(acc.code) ?? {
      code: acc.code,
      name: acc.name,
      type: acc.account_type,
      debit: 0,
      credit: 0,
      balance: 0,
    };
    current.debit += line.debit;
    current.credit += line.credit;
    current.balance =
      acc.normal_side === "credito" || acc.normal_side === "credit"
        ? current.credit - current.debit
        : current.debit - current.credit;
    map.set(acc.code, current);
  }
  return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
}

export function isResultAccount(type: string) {
  return ["ingreso", "egreso", "gasto", "costo"].includes(type);
}
