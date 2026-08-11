import {
  listPending,
  updateOperation,
  type PendingOperation,
} from "@/lib/ftg/offline.db";
import { buildManifest, chunk, isConfirmed, orderOperations, type ServerOpStatus, type SyncManifest } from "@/lib/ftg/sync.manifest";
import { openSyncBatch, pushSyncBatch } from "@/lib/ftg/sync.functions";

export const SUB_BATCH_SIZE = 25;

export type SyncPhase =
  | "idle"
  | "verificando"
  | "preparando"
  | "enviando"
  | "verificando_resultados"
  | "finalizando"
  | "completado"
  | "parcial"
  | "sin_conexion"
  | "error";

export type SyncProgress = {
  phase: SyncPhase;
  currentLabel: string;
  sent: number;
  total: number;
  confirmed: number;
  duplicated: number;
  pending: number;
  failed: number;
  review: number;
  startedAt: number | null;
  batchId: string | null;
  manifest: SyncManifest | null;
  errors: { label: string; message: string }[];
};

export const emptyProgress: SyncProgress = {
  phase: "idle",
  currentLabel: "",
  sent: 0,
  total: 0,
  confirmed: 0,
  duplicated: 0,
  pending: 0,
  failed: 0,
  review: 0,
  startedAt: null,
  batchId: null,
  manifest: null,
  errors: [],
};

const statusToLocal: Record<ServerOpStatus, PendingOperation["syncStatus"]> = {
  recibida: "sincronizada",
  ya_existia: "ya_existia",
  rechazada: "error",
  requiere_revision: "requiere_revision",
  pendiente: "pendiente",
  error_recuperable: "pendiente",
  error_definitivo: "error",
};

export type RunOptions = {
  operations?: PendingOperation[];
  onProgress?: (progress: SyncProgress) => void;
};

/** Ejecuta la sincronización de la jornada por sub-lotes y confirma operación por operación. */
export async function runDaySync(options: RunOptions = {}): Promise<SyncProgress> {
  let progress: SyncProgress = { ...emptyProgress, phase: "verificando", startedAt: Date.now() };
  const emit = () => options.onProgress?.({ ...progress });
  emit();

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    progress = { ...progress, phase: "sin_conexion" };
    emit();
    return progress;
  }

  const source = options.operations ?? (await listPending());
  const ops = orderOperations(source.filter((op) => op.entityType !== "file"));
  if (ops.length === 0) {
    progress = { ...progress, phase: "completado", currentLabel: "Todo está sincronizado" };
    emit();
    return progress;
  }

  progress = { ...progress, phase: "preparando", currentLabel: "Preparando datos", total: ops.length, pending: ops.length };
  emit();

  const manifest = await buildManifest(ops);
  progress = { ...progress, manifest, batchId: manifest.batchId };
  emit();

  try {
    await openSyncBatch({ data: { manifest } });
  } catch (error) {
    progress = {
      ...progress,
      phase: "error",
      errors: [{ label: "Lote", message: error instanceof Error ? error.message : "No se pudo abrir el lote" }],
    };
    emit();
    return progress;
  }

  const groups = chunk(ops, SUB_BATCH_SIZE);
  progress = { ...progress, phase: "enviando" };

  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index]!;
    progress = { ...progress, currentLabel: `Enviando operaciones ${progress.sent + 1} de ${ops.length}` };
    emit();

    for (const op of group) await updateOperation(op.id, { syncStatus: "enviando" });

    try {
      const { results } = await pushSyncBatch({
        data: {
          manifest,
          finalize: index === groups.length - 1,
          operations: group.map((op) => ({
            operationId: op.id,
            entityType: op.entityType,
            idempotencyKey: op.idempotencyKey,
            localSequence: op.localSequence,
            localCreatedAt: op.localCreatedAt,
            payload: op.payload,
          })),
        },
      });

      for (const result of results) {
        const op = group.find((o) => o.id === result.operationId);
        const status = result.status as ServerOpStatus;
        await updateOperation(result.operationId, {
          syncStatus: statusToLocal[status] ?? "pendiente",
          attempts: (op?.attempts ?? 0) + 1,
          lastError: result.message ?? null,
        });
        progress = {
          ...progress,
          sent: progress.sent + 1,
          confirmed: progress.confirmed + (status === "recibida" ? 1 : 0),
          duplicated: progress.duplicated + (status === "ya_existia" ? 1 : 0),
          review: progress.review + (status === "requiere_revision" ? 1 : 0),
          failed: progress.failed + (status === "rechazada" || status === "error_definitivo" ? 1 : 0),
          pending: Math.max(0, progress.pending - (isConfirmed(status) ? 1 : 0)),
          errors: result.message
            ? [...progress.errors, { label: op?.label ?? op?.entityType ?? "Operación", message: result.message }]
            : progress.errors,
        };
        emit();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error de red";
      for (const op of group) {
        await updateOperation(op.id, { syncStatus: "pendiente", attempts: op.attempts + 1, lastError: message });
      }
      progress = { ...progress, errors: [...progress.errors, { label: `Sub-lote ${index + 1}`, message }] };
      emit();
    }
  }

  progress = { ...progress, phase: "verificando_resultados", currentLabel: "Verificando resultados" };
  emit();

  const stillPending = await listPending();
  const remaining = stillPending.filter((op) => op.entityType !== "file").length;
  progress = {
    ...progress,
    phase: remaining === 0 ? "completado" : "parcial",
    currentLabel: remaining === 0 ? "Jornada sincronizada" : "Algunas operaciones requieren atención",
    pending: remaining,
  };
  emit();
  return progress;
}
