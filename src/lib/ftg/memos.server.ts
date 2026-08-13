import { accountForFundKind } from "@/lib/ftg/accounting";

type PostMemoArgs = {
  memoId: string;
  userId: string;
  idempotencyKey?: string | undefined;
  note?: string | null;
  requireApproved?: boolean;
};

/** Motor común de posteo + conciliación de minutas (idempotente). */
export async function postMemoInternal(args: PostMemoArgs) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: memo, error: memoError } = await supabaseAdmin
    .from("treasury_memos")
    .select("*")
    .eq("id", args.memoId)
    .maybeSingle();
  if (memoError) throw new Error(memoError.message);
  if (!memo) throw new Error("La minuta no existe.");
  if (memo.status === "anulada") throw new Error("La minuta está anulada.");
  if (memo.status === "conciliada") {
    return { id: memo.id, status: "conciliada", journal_entry_id: memo.journal_entry_id, duplicated: true };
  }
  if (args.requireApproved && memo.status !== "aprobada") {
    throw new Error("Primero aprobá la minuta para poder postearla.");
  }

  const idempotencyKey = args.idempotencyKey ?? memo.idempotency_key ?? `memo-${memo.id}`;

  const amount = Number(memo.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("La minuta no tiene un importe válido.");

  let debitCode = memo.debit_account_code;
  let creditCode = memo.credit_account_code;
  if (memo.memo_type === "movimiento_fondos") {
    const ids = [memo.cash_source_to_id, memo.cash_source_from_id].filter(Boolean) as string[];
    const sources = ids.length
      ? (await supabaseAdmin.from("cash_sources").select("id, fund_kind").in("id", ids)).data ?? []
      : [];
    const kindOf = (id: string | null) => sources.find((s) => s.id === id)?.fund_kind ?? null;
    // El destino recibe fondos (debe) y el origen los entrega (haber).
    debitCode = debitCode ?? accountForFundKind(kindOf(memo.cash_source_to_id));
    creditCode = creditCode ?? accountForFundKind(kindOf(memo.cash_source_from_id));
    if (debitCode === creditCode) {
      throw new Error("El movimiento debe usar cuentas distintas: revisá las cajas de origen y destino.");
    }
  }
  if (!debitCode || !creditCode) throw new Error("Indicá la cuenta del debe y la del haber antes de postear.");

  const codes = [...new Set([debitCode, creditCode])];
  const accounts = await supabaseAdmin.from("ledger_accounts").select("code").in("code", codes);
  const known = new Set((accounts.data ?? []).map((a) => a.code));
  const missing = codes.filter((c) => !known.has(c));
  if (missing.length > 0) throw new Error(`Cuentas inexistentes en el plan: ${missing.join(", ")}`);

  let entryId: string | null = memo.journal_entry_id;
  if (!entryId) {
    const existing = await supabaseAdmin
      .from("journal_entries")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    entryId = existing.data?.id ?? null;
  }

  if (!entryId) {
    const { data: created, error } = await supabaseAdmin.rpc("post_journal_entry", {
      _org: memo.organization_id,
      ...(memo.location_id ? { _loc: memo.location_id } : {}),
      _date: new Date(memo.created_at).toISOString().slice(0, 10),
      _description: `Minuta · ${memo.description}`,
      _source_type: "minuta",
      _source_id: memo.id,
      _currency: memo.currency_code,
      _lines: [
        { account_code: debitCode, debit: amount, credit: 0, description: memo.description },
        { account_code: creditCode, debit: 0, credit: amount, description: memo.description },
      ],
      _created_by: args.userId,
    } as never);
    if (error) throw new Error(error.message);
    entryId = (created as string) ?? null;
    if (entryId) {
      await supabaseAdmin.from("journal_entries").update({ idempotency_key: idempotencyKey }).eq("id", entryId);
    }
  }
  if (!entryId) throw new Error("No se pudo registrar el asiento de la minuta.");

  const now = new Date().toISOString();
  const { error: updateError } = await supabaseAdmin
    .from("treasury_memos")
    .update({
      status: "conciliada",
      journal_entry_id: entryId,
      idempotency_key: idempotencyKey,
      posted_at: memo.posted_at ?? now,
      reconciled_at: now,
      ...(args.note ? { reconciliation_note: args.note } : {}),
      ...(memo.approved_by ? {} : { approved_by: args.userId, approved_at: now }),
    })
    .eq("id", memo.id);
  if (updateError) throw new Error(updateError.message);

  await supabaseAdmin.from("audit_logs").insert({
    user_id: args.userId,
    action: "minuta_conciliada",
    entity: "treasury_memos",
    entity_id: memo.id,
    organization_id: memo.organization_id,
    location_id: memo.location_id,
    details: { amount, memo_type: memo.memo_type, journal_entry_id: entryId, debitCode, creditCode },
  });

  return { id: memo.id, status: "conciliada", journal_entry_id: entryId, duplicated: false };
}
