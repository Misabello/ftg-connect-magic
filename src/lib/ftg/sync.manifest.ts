import { ENTITY_ORDER, type PendingOperation, type SyncEntityType } from "@/lib/ftg/offline.db";

export type SyncManifest = {
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
  createdAt: string;
};

/** Ordena las operaciones respetando dependencias y prioridad. */
export function orderOperations(ops: PendingOperation[]): PendingOperation[] {
  const rank = (type: SyncEntityType) => {
    const index = ENTITY_ORDER.indexOf(type);
    return index === -1 ? ENTITY_ORDER.length : index;
  };
  return [...ops].sort((a, b) => rank(a.entityType) - rank(b.entityType) || a.localSequence - b.localSequence);
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function sha256(text: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) return String(text.length);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function buildManifest(ops: PendingOperation[]): Promise<SyncManifest> {
  const ordered = orderOperations(ops);
  const countsByType: Record<string, number> = {};
  const totalsByCurrency: Record<string, number> = {};
  for (const op of ordered) {
    countsByType[op.entityType] = (countsByType[op.entityType] ?? 0) + 1;
    if (op.amount && op.currency) {
      totalsByCurrency[op.currency] = Number(((totalsByCurrency[op.currency] ?? 0) + op.amount).toFixed(2));
    }
  }
  const sequences = ordered.map((o) => o.localSequence);
  const first = ordered[0];
  const integrityHash = await sha256(ordered.map((o) => `${o.entityType}:${o.idempotencyKey}:${o.localSequence}`).join("|"));

  return {
    batchId: crypto.randomUUID(),
    businessDate: first?.businessDate ?? new Date().toISOString().slice(0, 10),
    deviceIdentifier: first?.deviceId ?? "",
    organizationId: first?.organizationId ?? null,
    locationId: first?.locationId ?? null,
    pointOfSaleId: first?.pointOfSaleId ?? null,
    cashSessionId: first?.cashSessionId ?? null,
    countsByType,
    totalsByCurrency,
    firstSequence: sequences.length ? Math.min(...sequences) : null,
    lastSequence: sequences.length ? Math.max(...sequences) : null,
    operationCount: ordered.length,
    integrityHash,
    createdAt: new Date().toISOString(),
  };
}

export type ServerOpStatus =
  | "recibida"
  | "ya_existia"
  | "rechazada"
  | "requiere_revision"
  | "pendiente"
  | "error_recuperable"
  | "error_definitivo";

export type OperationResult = {
  operationId: string;
  idempotencyKey: string;
  status: ServerOpStatus;
  entityId?: string | null;
  message?: string | null;
};

export function isConfirmed(status: ServerOpStatus) {
  return status === "recibida" || status === "ya_existia";
}
