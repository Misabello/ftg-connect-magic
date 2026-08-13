import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Carga un asiento manual balanceado usando el motor de partida doble. */
export const postManualEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        idempotency_key: z.string().min(8).max(80),
        entry_date: z.string().min(8).max(10),
        description: z.string().trim().min(3).max(240),
        organization_id: z.string().uuid().nullable().optional(),
        location_id: z.string().uuid().nullable().optional(),
        point_of_sale_id: z.string().uuid().nullable().optional(),
        currency_code: z.string().trim().min(3).max(3).default("ARS"),
        source_type: z.string().trim().max(30).default("manual"),
        lines: z
          .array(
            z.object({
              account_code: z.string().trim().min(1).max(20),
              debit: z.number().min(0),
              credit: z.number().min(0),
              description: z.string().trim().max(200).nullable().optional(),
            }),
          )
          .min(2)
          .max(60),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin", { _user_id: userId });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Solo un perfil administrativo o contable puede cargar asientos manuales.");

    const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
    const debit = round2(data.lines.reduce((acc, l) => acc + l.debit, 0));
    const credit = round2(data.lines.reduce((acc, l) => acc + l.credit, 0));
    if (debit <= 0) throw new Error("El asiento no tiene importes.");
    if (Math.abs(debit - credit) > 0.02) throw new Error(`Asiento desbalanceado: debe ${debit} / haber ${credit}.`);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const existing = await supabaseAdmin
      .from("journal_entries")
      .select("id")
      .eq("idempotency_key", data.idempotency_key)
      .maybeSingle();
    if (existing.data?.id) return { id: existing.data.id, duplicated: true, debit, credit };

    let organizationId = data.organization_id ?? null;
    if (!organizationId && data.location_id) {
      const loc = await supabaseAdmin.from("locations").select("organization_id").eq("id", data.location_id).maybeSingle();
      organizationId = loc.data?.organization_id ?? null;
    }
    if (!organizationId) {
      const org = await supabaseAdmin.from("organizations").select("id").limit(1).maybeSingle();
      organizationId = org.data?.id ?? null;
    }
    if (!organizationId) throw new Error("No se encontró la organización.");

    const codes = [...new Set(data.lines.map((l) => l.account_code))];
    const accounts = await supabaseAdmin.from("ledger_accounts").select("code").in("code", codes);
    const known = new Set((accounts.data ?? []).map((a) => a.code));
    const missing = codes.filter((c) => !known.has(c));
    if (missing.length > 0) throw new Error(`Cuentas inexistentes en el plan: ${missing.join(", ")}`);

    const { data: entryId, error } = await supabaseAdmin.rpc("post_journal_entry", {
      _org: organizationId,
      ...(data.location_id ? { _loc: data.location_id } : {}),
      ...(data.point_of_sale_id ? { _pos: data.point_of_sale_id } : {}),
      _date: data.entry_date,
      _description: data.description,
      _source_type: data.source_type || "manual",
      _currency: data.currency_code,
      _lines: data.lines.map((l) => ({
        account_code: l.account_code,
        debit: l.debit,
        credit: l.credit,
        description: l.description ?? null,
      })),
      _created_by: userId,
    });
    if (error) throw new Error(error.message);
    if (!entryId) throw new Error("No se pudo registrar el asiento.");

    await supabaseAdmin
      .from("journal_entries")
      .update({ idempotency_key: data.idempotency_key })
      .eq("id", entryId as string);

    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      action: "asiento_manual_creado",
      entity: "journal_entries",
      entity_id: entryId as string,
      organization_id: organizationId,
      location_id: data.location_id ?? null,
      details: {
        description: data.description,
        entry_date: data.entry_date,
        debit,
        credit,
        lines: data.lines,
      },
    });

    return { id: entryId as string, duplicated: false, debit, credit };
  });

/** Aprueba una minuta: postea el asiento (nota contable o movimiento de fondos) y la concilia. */
export const approveMemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ memo_id: z.string().uuid(), idempotency_key: z.string().min(8).max(80) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin", { _user_id: userId });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Solo un perfil administrativo o contable puede aprobar minutas.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: memo, error: memoError } = await supabaseAdmin
      .from("treasury_memos")
      .select("*")
      .eq("id", data.memo_id)
      .maybeSingle();
    if (memoError) throw new Error(memoError.message);
    if (!memo) throw new Error("La minuta no existe.");
    if (memo.status !== "pendiente") throw new Error("La minuta ya fue procesada.");

    const amount = Number(memo.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("La minuta no tiene un importe válido.");

    let debitCode = memo.debit_account_code;
    let creditCode = memo.credit_account_code;
    if (memo.memo_type === "movimiento_fondos") {
      debitCode = debitCode ?? "1.1.1";
      creditCode = creditCode ?? "1.1.2";
    }
    if (!debitCode || !creditCode) throw new Error("Indicá la cuenta del debe y la del haber antes de postear.");

    let entryId: string | null = memo.journal_entry_id;
    if (!entryId) {
      const existing = await supabaseAdmin
        .from("journal_entries")
        .select("id")
        .eq("idempotency_key", data.idempotency_key)
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
        _created_by: userId,
      });
      if (error) throw new Error(error.message);
      entryId = (created as string) ?? null;
      if (entryId) {
        await supabaseAdmin
          .from("journal_entries")
          .update({ idempotency_key: data.idempotency_key })
          .eq("id", entryId);
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from("treasury_memos")
      .update({ status: "conciliada", journal_entry_id: entryId })
      .eq("id", memo.id);
    if (updateError) throw new Error(updateError.message);

    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      action: "minuta_conciliada",
      entity: "treasury_memos",
      entity_id: memo.id,
      organization_id: memo.organization_id,
      location_id: memo.location_id,
      details: { amount, memo_type: memo.memo_type, journal_entry_id: entryId, debitCode, creditCode },
    });

    return { id: memo.id, journal_entry_id: entryId };
  });

/** Anula una minuta pendiente dejando registro en auditoría. */
export const cancelMemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ memo_id: z.string().uuid(), reason: z.string().trim().max(240).optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin", { _user_id: userId });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Solo un perfil administrativo o contable puede anular minutas.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: memo, error } = await supabaseAdmin
      .from("treasury_memos")
      .update({ status: "anulada" })
      .eq("id", data.memo_id)
      .eq("status", "pendiente")
      .select("id, organization_id, location_id, amount")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!memo) throw new Error("Solo se pueden anular minutas pendientes.");

    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      action: "minuta_anulada",
      entity: "treasury_memos",
      entity_id: memo.id,
      organization_id: memo.organization_id,
      location_id: memo.location_id,
      details: { amount: memo.amount, reason: data.reason ?? null },
    });

    return { id: memo.id };
  });
