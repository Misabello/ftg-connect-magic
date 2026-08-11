import type { SupabaseClient } from "@supabase/supabase-js";

import type { ServerOpStatus } from "@/lib/ftg/sync.manifest";

type AnyClient = SupabaseClient<any, any, any>;

export type IncomingOperation = {
  operationId: string;
  entityType: string;
  idempotencyKey: string;
  localSequence: number;
  localCreatedAt: string;
  payload: Record<string, any>;
};

export type ApplyOutcome = { status: ServerOpStatus; entityId?: string | null; message?: string | null };

const DUPLICATE_CODES = new Set(["23505"]);

function classify(error: { code?: string; message?: string } | null): ApplyOutcome {
  if (!error) return { status: "recibida" };
  if (error.code && DUPLICATE_CODES.has(error.code)) return { status: "ya_existia" };
  if (error.code === "42501" || error.code === "PGRST301") {
    return { status: "rechazada", message: "El dispositivo no tiene permiso sobre ese punto de venta" };
  }
  if (error.code === "23503") return { status: "requiere_revision", message: "Falta la entidad principal relacionada" };
  return { status: "error_recuperable", message: error.message ?? "Error de red" };
}

async function findExisting(supabase: AnyClient, table: string, key: string) {
  const { data } = await supabase.from(table).select("id").eq("idempotency_key", key).maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

async function insertSimple(
  supabase: AnyClient,
  table: string,
  key: string,
  row: Record<string, unknown>,
): Promise<ApplyOutcome> {
  const existing = await findExisting(supabase, table, key);
  if (existing) return { status: "ya_existia", entityId: existing };
  const { data, error } = await supabase
    .from(table)
    .insert({ ...row, idempotency_key: key })
    .select("id")
    .single();
  if (error) return classify(error);
  return { status: "recibida", entityId: (data as { id: string }).id };
}

async function applySale(supabase: AnyClient, op: IncomingOperation): Promise<ApplyOutcome> {
  const { sale, items = [], payments = [], audit } = op.payload as {
    sale: Record<string, unknown>;
    items?: Record<string, unknown>[];
    payments?: Record<string, unknown>[];
    audit?: Record<string, unknown>;
  };
  const existing = await findExisting(supabase, "sales", op.idempotencyKey);
  if (existing) return { status: "ya_existia", entityId: existing };

  const { data, error } = await supabase
    .from("sales")
    .insert({ ...sale, idempotency_key: op.idempotencyKey, local_created_at: op.localCreatedAt, synced_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error) return classify(error);
  const saleId = (data as { id: string }).id;

  if (items.length) {
    const { error: itemsError } = await supabase.from("sale_items").insert(items.map((i) => ({ ...i, sale_id: saleId })));
    if (itemsError) return { status: "requiere_revision", entityId: saleId, message: "La venta se registró pero fallaron los ítems" };
  }
  if (payments.length) {
    const { error: payError } = await supabase.from("sale_payments").insert(
      payments.map((p, index) => ({
        ...p,
        sale_id: saleId,
        idempotency_key: `${op.idempotencyKey}:pay:${index}`,
      })),
    );
    if (payError && !DUPLICATE_CODES.has(payError.code ?? "")) {
      return { status: "requiere_revision", entityId: saleId, message: "La venta se registró pero fallaron los pagos" };
    }
  }
  if (audit) await supabase.from("audit_logs").insert({ ...audit, entity_id: saleId, synced_at: new Date().toISOString() });
  return { status: "recibida", entityId: saleId };
}

async function applyUpdate(
  supabase: AnyClient,
  table: string,
  op: IncomingOperation,
): Promise<ApplyOutcome> {
  const { id, changes } = op.payload as { id: string; changes: Record<string, unknown> };
  if (!id) return { status: "error_definitivo", message: "Falta el identificador del registro" };
  const { error } = await supabase.from(table).update({ ...changes, idempotency_key: op.idempotencyKey }).eq("id", id);
  if (error) return classify(error);
  return { status: "recibida", entityId: id };
}

/** Aplica una operación del lote respetando idempotencia. */
export async function applyOperation(supabase: AnyClient, op: IncomingOperation): Promise<ApplyOutcome> {
  try {
    switch (op.entityType) {
      case "sale":
        return await applySale(supabase, op);
      case "cash_session_open":
        return await insertSimple(supabase, "cash_sessions", op.idempotencyKey, op.payload["row"] as Record<string, unknown>);
      case "stock_movement":
        return await insertSimple(supabase, "stock_movements", op.idempotencyKey, op.payload["row"] as Record<string, unknown>);
      case "finance_document":
        return await insertSimple(supabase, "finance_documents", op.idempotencyKey, op.payload["row"] as Record<string, unknown>);
      case "photo":
        return await insertSimple(supabase, "photos", op.idempotencyKey, op.payload["row"] as Record<string, unknown>);
      case "photo_consent":
        return await insertSimple(supabase, "photo_consents", op.idempotencyKey, op.payload["row"] as Record<string, unknown>);
      case "operation_incident":
        return await insertSimple(supabase, "operation_incidents", op.idempotencyKey, op.payload["row"] as Record<string, unknown>);
      case "checklist_item":
        return await applyUpdate(supabase, "operation_checklist_items", op);
      case "cash_session_close":
        return await applyUpdate(supabase, "cash_sessions", op);
      case "file":
        return { status: "pendiente", message: "El archivo se sube por separado" };
      default:
        return { status: "error_definitivo", message: `Tipo de operación desconocido: ${op.entityType}` };
    }
  } catch (error) {
    return { status: "error_recuperable", message: error instanceof Error ? error.message : "Error inesperado" };
  }
}
