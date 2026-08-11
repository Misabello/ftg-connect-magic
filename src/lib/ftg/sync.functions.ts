import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ManifestInput = {
  batchId: string;
  businessDate: string;
  deviceIdentifier: string;
  organizationId: string | null;
  locationId: string | null;
  pointOfSaleId: string | null;
  cashSessionId: string | null;
  countsByType: Record<string, number>;
  totalsByCurrency: Record<string, number>;
  firstSequence: number | null;
  lastSequence: number | null;
  operationCount: number;
  integrityHash: string;
};

type OperationInput = {
  operationId: string;
  entityType: string;
  idempotencyKey: string;
  localSequence: number;
  localCreatedAt: string;
  payload: Record<string, unknown>;
};

type PushInput = { manifest: ManifestInput; operations: OperationInput[]; finalize?: boolean };

/** Registra (o reutiliza) el lote de la jornada antes de enviar los sub-lotes. */
export const openSyncBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { manifest: ManifestInput }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const m = data.manifest;

    let deviceId: string | null = null;
    if (m.deviceIdentifier) {
      const { data: device } = await supabase
        .from("sync_devices")
        .select("id")
        .eq("device_identifier", m.deviceIdentifier)
        .maybeSingle();
      if (device?.id) {
        deviceId = device.id;
        await supabase
          .from("sync_devices")
          .update({ last_seen_at: new Date().toISOString(), point_of_sale_id: m.pointOfSaleId, location_id: m.locationId })
          .eq("id", device.id);
      } else {
        const { data: created } = await supabase
          .from("sync_devices")
          .insert({
            device_identifier: m.deviceIdentifier,
            organization_id: m.organizationId,
            location_id: m.locationId,
            point_of_sale_id: m.pointOfSaleId,
            last_seen_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        deviceId = created?.id ?? null;
      }
    }

    const { data: batch, error } = await supabase
      .from("sync_batches")
      .insert({
        id: m.batchId,
        organization_id: m.organizationId,
        location_id: m.locationId,
        point_of_sale_id: m.pointOfSaleId,
        cash_session_id: m.cashSessionId,
        device_id: deviceId,
        device_identifier: m.deviceIdentifier,
        business_date: m.businessDate,
        first_sequence: m.firstSequence,
        last_sequence: m.lastSequence,
        operation_count: m.operationCount,
        totals_by_currency: m.totalsByCurrency,
        integrity_hash: m.integrityHash,
        status: "en_proceso",
        summary: { countsByType: m.countsByType },
        created_by: userId,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error && error.code !== "23505") throw new Error(error.message);
    return { batchId: batch?.id ?? m.batchId, deviceId };
  });

/** Envía un sub-lote de operaciones y devuelve el resultado por operación. */
export const pushSyncBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: PushInput) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { applyOperation } = await import("@/lib/ftg/sync.server");
    const m = data.manifest;

    const results: {
      operationId: string;
      idempotencyKey: string;
      status: string;
      entityId?: string | null;
      message?: string | null;
    }[] = [];

    for (const op of data.operations) {
      const outcome = await applyOperation(supabase, op);
      results.push({ operationId: op.operationId, idempotencyKey: op.idempotencyKey, ...outcome });

      await supabase.from("sync_batch_items").upsert(
        {
          sync_batch_id: m.batchId,
          entity_type: op.entityType,
          entity_id: outcome.entityId ?? null,
          idempotency_key: op.idempotencyKey,
          local_sequence: op.localSequence,
          local_created_at: op.localCreatedAt,
          sync_status: outcome.status,
          attempts: 1,
          server_confirmed_at:
            outcome.status === "recibida" || outcome.status === "ya_existia" ? new Date().toISOString() : null,
          error_message: outcome.message ?? null,
        },
        { onConflict: "sync_batch_id,idempotency_key" },
      );

      if (outcome.status === "requiere_revision") {
        const { data: item } = await supabase
          .from("sync_batch_items")
          .select("id")
          .eq("sync_batch_id", m.batchId)
          .eq("idempotency_key", op.idempotencyKey)
          .maybeSingle();
        if (item?.id) {
          await supabase.from("sync_conflicts").insert({
            sync_batch_item_id: item.id,
            conflict_type: op.entityType,
            local_version: op.payload as never,
            resolution_status: "pendiente",
          });
        }
      }
    }

    if (data.finalize) {
      const { data: items } = await supabase
        .from("sync_batch_items")
        .select("sync_status")
        .eq("sync_batch_id", m.batchId);
      const rows = items ?? [];
      const confirmed = rows.filter((r) => r.sync_status === "recibida" || r.sync_status === "ya_existia").length;
      const complete = confirmed === m.operationCount && rows.length === m.operationCount;
      await supabase
        .from("sync_batches")
        .update({
          status: complete ? "completado" : "incompleto",
          completed_at: new Date().toISOString(),
          summary: { countsByType: m.countsByType, confirmed, expected: m.operationCount },
        })
        .eq("id", m.batchId);

      await supabase.from("audit_logs").insert({
        organization_id: m.organizationId,
        location_id: m.locationId,
        user_id: userId,
        action: complete ? "sync_batch_completado" : "sync_batch_incompleto",
        entity: "sync_batches",
        entity_id: m.batchId,
        details: { confirmed, expected: m.operationCount, hash: m.integrityHash } as never,
      });

      if (m.deviceIdentifier) {
        await supabase
          .from("sync_devices")
          .update({ last_sync_at: new Date().toISOString(), status: complete ? "ok" : "incompleto" })
          .eq("device_identifier", m.deviceIdentifier);
      }
    }

    return { results };
  });

/** Historial de lotes del punto de venta para el centro de sincronización. */
export const listSyncBatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { pointOfSaleId?: string | null; limit?: number }) => input)
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("sync_batches")
      .select("id, business_date, operation_count, totals_by_currency, status, created_at, completed_at, summary")
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 20, 100));
    if (data.pointOfSaleId) query = query.eq("point_of_sale_id", data.pointOfSaleId);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
