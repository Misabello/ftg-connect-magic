import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CloseSummary } from "@/lib/ftg/pos-close";

/**
 * Cierra la caja del punto de venta, genera el ajuste contable del arqueo y
 * deja preparada la notificación de cierre para los usuarios configurados.
 */
export const closeCashSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        cash_session_id: z.string().uuid(),
        counted_amount: z.number().min(0),
        notes: z.string().trim().max(400).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<CloseSummary> => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildCloseEmail, CLOSE_SENDER_EMAIL } = await import("@/lib/ftg/pos-close");

    const round2 = (v: number) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("cash_sessions")
      .select(
        "id, status, opened_at, opening_amount, currency_code, organization_id, location_id, point_of_sale_id",
      )
      .eq("id", data.cash_session_id)
      .maybeSingle();
    if (sessionError) throw new Error(sessionError.message);
    if (!session) throw new Error("La caja no existe.");

    const [posRes, locRes, profileRes, salesRes] = await Promise.all([
      supabaseAdmin.from("points_of_sale").select("id, name, code").eq("id", session.point_of_sale_id).maybeSingle(),
      session.location_id
        ? supabaseAdmin.from("locations").select("id, name").eq("id", session.location_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabaseAdmin.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
      supabaseAdmin
        .from("sales")
        .select(
          "id, total, status, sale_items(description, quantity, line_total), sale_payments(amount, method_name, payment_method_id)",
        )
        .eq("cash_session_id", session.id),
    ]);

    const sales = (salesRes.data ?? []).filter((s) => s.status === "completada");
    const salesTotal = round2(sales.reduce((acc, s) => acc + Number(s.total), 0));

    const itemMap = new Map<string, { description: string; quantity: number; total: number }>();
    for (const sale of sales) {
      for (const item of sale.sale_items ?? []) {
        const key = item.description ?? "Sin detalle";
        const current = itemMap.get(key) ?? { description: key, quantity: 0, total: 0 };
        current.quantity += Number(item.quantity ?? 0);
        current.total = round2(current.total + Number(item.line_total ?? 0));
        itemMap.set(key, current);
      }
    }
    const items = [...itemMap.values()].sort((a, b) => b.total - a.total);

    const methodMap = new Map<string, number>();
    const cashMethodIds = new Set(
      (
        (await supabaseAdmin.from("payment_methods").select("id, kind").eq("kind", "efectivo")).data ?? []
      ).map((m) => m.id),
    );
    let cashCollected = 0;
    for (const sale of sales) {
      for (const payment of sale.sale_payments ?? []) {
        const name = payment.method_name ?? "Sin especificar";
        methodMap.set(name, round2((methodMap.get(name) ?? 0) + Number(payment.amount ?? 0)));
        if (payment.payment_method_id && cashMethodIds.has(payment.payment_method_id)) {
          cashCollected = round2(cashCollected + Number(payment.amount ?? 0));
        }
      }
    }
    const methods = [...methodMap.entries()]
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount);

    const openingAmount = round2(Number(session.opening_amount ?? 0));
    const expectedAmount = round2(openingAmount + cashCollected);
    const countedAmount = round2(data.counted_amount);
    const differenceAmount = round2(countedAmount - expectedAmount);
    const closedAt = new Date();
    const closedOn = closedAt.toISOString().slice(0, 10);

    if (session.status === "abierta") {
      const { error: closeError } = await supabaseAdmin
        .from("cash_sessions")
        .update({
          status: "cerrada",
          closed_at: closedAt.toISOString(),
          closed_by: userId,
          expected_amount: expectedAmount,
          counted_amount: countedAmount,
          difference_amount: differenceAmount,
          notes: data.notes || null,
        })
        .eq("id", session.id)
        .eq("status", "abierta");
      if (closeError) throw new Error(closeError.message);
    }

    // Ajuste contable del arqueo (idempotente por caja).
    const idempotencyKey = `cierre-caja-${session.id}`;
    let journalEntryId: string | null = null;
    let journalNote = "Arqueo sin diferencias: no requiere ajuste contable.";

    const existingEntry = await supabaseAdmin
      .from("journal_entries")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingEntry.data?.id) {
      journalEntryId = existingEntry.data.id;
      journalNote = "Ajuste contable de cierre ya registrado en el libro diario.";
    } else if (Math.abs(differenceAmount) >= 0.01) {
      const amount = round2(Math.abs(differenceAmount));
      const surplus = differenceAmount > 0;
      const lines = surplus
        ? [
            { account_code: "1.1.1", debit: amount, credit: 0, description: "Sobrante de arqueo" },
            { account_code: "4.1.1", debit: 0, credit: amount, description: "Sobrante de caja" },
          ]
        : [
            { account_code: "5.1.1", debit: amount, credit: 0, description: "Faltante de arqueo" },
            { account_code: "1.1.1", debit: 0, credit: amount, description: "Faltante de caja" },
          ];
      const { data: entryId, error: entryError } = await supabaseAdmin.rpc("post_journal_entry", {
        _org: session.organization_id,
        ...(session.location_id ? { _loc: session.location_id } : {}),
        ...(session.point_of_sale_id ? { _pos: session.point_of_sale_id } : {}),
        _session: session.id,
        _date: closedOn,
        _description: `Cierre de caja ${posRes.data?.name ?? ""} — ${surplus ? "sobrante" : "faltante"} de arqueo`,
        _source_type: "cierre_caja",
        _source_id: session.id,
        _currency: session.currency_code ?? "ARS",
        _lines: lines,
        _created_by: userId,
      } as never);
      if (entryError) throw new Error(entryError.message);
      journalEntryId = (entryId as string | null) ?? null;
      if (journalEntryId) {
        await supabaseAdmin
          .from("journal_entries")
          .update({ idempotency_key: idempotencyKey })
          .eq("id", journalEntryId);
      }
      journalNote = `Ajuste contable registrado por ${surplus ? "sobrante" : "faltante"} de ${amount}.`;
    }

    const recipientsRes = await supabaseAdmin
      .from("pos_notification_recipients")
      .select("full_name, email, phone, point_of_sale_id, location_id")
      .eq("organization_id", session.organization_id)
      .eq("is_active", true);
    const recipients = (recipientsRes.data ?? [])
      .filter(
        (r) =>
          (!r.point_of_sale_id || r.point_of_sale_id === session.point_of_sale_id) &&
          (!r.location_id || r.location_id === session.location_id),
      )
      .map((r) => ({ full_name: r.full_name, email: r.email, phone: r.phone ?? null }));

    const { subject, body } = buildCloseEmail({
      posName: posRes.data?.name ?? "Punto de venta",
      locationName: locRes.data?.name ?? null,
      closedOn,
      currency: session.currency_code ?? "ARS",
      openingAmount,
      expectedAmount,
      countedAmount,
      differenceAmount,
      salesCount: sales.length,
      salesTotal,
      items,
      methods,
      journalNote,
      closedByName: profileRes.data?.full_name ?? null,
    });

    const notification = await supabaseAdmin
      .from("pos_close_notifications")
      .insert({
        organization_id: session.organization_id,
        location_id: session.location_id,
        point_of_sale_id: session.point_of_sale_id,
        cash_session_id: session.id,
        journal_entry_id: journalEntryId,
        subject,
        body,
        sender_email: CLOSE_SENDER_EMAIL,
        recipients,
        totals: { openingAmount, expectedAmount, countedAmount, differenceAmount, salesTotal, salesCount: sales.length },
        items,
        status: recipients.length > 0 ? "preparada" : "sin_destinatarios",
        created_by: userId,
      })
      .select("id")
      .maybeSingle();

    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      action: "cierre_caja",
      entity: "cash_sessions",
      entity_id: session.id,
      organization_id: session.organization_id,
      location_id: session.location_id,
      details: { expectedAmount, countedAmount, differenceAmount, salesTotal, journalEntryId },
    });

    return {
      sessionId: session.id,
      posName: posRes.data?.name ?? "Punto de venta",
      locationName: locRes.data?.name ?? null,
      closedOn,
      currency: session.currency_code ?? "ARS",
      openingAmount,
      expectedAmount,
      countedAmount,
      differenceAmount,
      salesCount: sales.length,
      salesTotal,
      items,
      methods,
      journalEntryId,
      journalNote,
      subject,
      body,
      recipients,
      notificationId: notification.data?.id ?? null,
    };
  });

/** Marca la notificación de cierre como enviada al abrir el mail. */
export const markCloseNotificationSent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ notification_id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("pos_close_notifications")
      .update({ status: "enviada" })
      .eq("id", data.notification_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });