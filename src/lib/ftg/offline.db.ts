/**
 * Cola local de operaciones del punto de venta (IndexedDB).
 * Reemplaza progresivamente la cola de ventas en localStorage sin perder datos.
 */
export type SyncEntityType =
  | "cash_session_open"
  | "sale"
  | "stock_movement"
  | "finance_document"
  | "photo"
  | "photo_consent"
  | "operation_incident"
  | "checklist_item"
  | "cash_session_close"
  | "file";

export type SyncStatus =
  | "pendiente"
  | "esperando_conexion"
  | "enviando"
  | "sincronizada"
  | "ya_existia"
  | "requiere_revision"
  | "error";

export type SyncPriority = "alta" | "media" | "baja";

export type PendingOperation = {
  id: string;
  entityType: SyncEntityType;
  priority: SyncPriority;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  deviceId: string;
  organizationId: string | null;
  locationId: string | null;
  pointOfSaleId: string | null;
  cashSessionId: string | null;
  businessDate: string;
  localSequence: number;
  localCreatedAt: string;
  syncStatus: SyncStatus;
  attempts: number;
  lastError?: string | null | undefined;
  currency?: string | null | undefined;
  amount?: number | null | undefined;
  label?: string | undefined;
};

const DB_NAME = "ftg-offline";
const DB_VERSION = 1;
const STORE = "operations";
const EVENT = "ftg:offline-queue";
const SEQ_KEY = "ftg.offline.sequence";
const DEVICE_KEY = "ftg.offline.device";
const LEGACY_KEY = "ftg.offline.sales";
const MODE_KEY = "ftg.offline.mode";

const isBrowser = () => typeof window !== "undefined" && typeof indexedDB !== "undefined";

export const ENTITY_LABELS: Record<SyncEntityType, string> = {
  cash_session_open: "Apertura de caja",
  sale: "Ventas",
  stock_movement: "Movimientos de stock",
  finance_document: "Facturas pendientes",
  photo: "Fotografías",
  photo_consent: "Consentimientos",
  operation_incident: "Incidentes",
  checklist_item: "Checklist de cierre",
  cash_session_close: "Cierre de caja",
  file: "Archivos pesados",
};

/** Orden de dependencias: nunca se envía un dependiente antes que su entidad principal. */
export const ENTITY_ORDER: SyncEntityType[] = [
  "cash_session_open",
  "sale",
  "stock_movement",
  "finance_document",
  "photo_consent",
  "photo",
  "operation_incident",
  "file",
  "checklist_item",
  "cash_session_close",
];

export function deviceIdentifier(): string {
  if (!isBrowser()) return "server";
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function nextLocalSequence(): number {
  if (!isBrowser()) return 0;
  const current = Number(window.localStorage.getItem(SEQ_KEY) ?? "0") + 1;
  window.localStorage.setItem(SEQ_KEY, String(current));
  return current;
}

export function syncMode(): "automatico" | "manual" {
  if (!isBrowser()) return "automatico";
  return window.localStorage.getItem(MODE_KEY) === "manual" ? "manual" : "automatico";
}

export function setSyncMode(mode: "automatico" | "manual") {
  if (!isBrowser()) return;
  window.localStorage.setItem(MODE_KEY, mode);
  notify();
}

function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENT));
}

export function subscribeQueue(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("syncStatus", "syncStatus");
        store.createIndex("businessDate", "businessDate");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = run(transaction.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

export async function listOperations(): Promise<PendingOperation[]> {
  if (!isBrowser()) return [];
  try {
    const all = await tx<PendingOperation[]>("readonly", (store) => store.getAll() as IDBRequest<PendingOperation[]>);
    return all.sort((a, b) => a.localSequence - b.localSequence);
  } catch {
    return [];
  }
}

export async function listPending(): Promise<PendingOperation[]> {
  const all = await listOperations();
  return all.filter((op) => op.syncStatus !== "sincronizada" && op.syncStatus !== "ya_existia");
}

export async function putOperation(op: PendingOperation) {
  await tx("readwrite", (store) => store.put(op));
  notify();
}

export async function updateOperation(id: string, patch: Partial<PendingOperation>) {
  const current = await tx<PendingOperation | undefined>("readonly", (store) => store.get(id) as IDBRequest<PendingOperation | undefined>);
  if (!current) return;
  await tx("readwrite", (store) => store.put({ ...current, ...patch }));
  notify();
}

export async function deleteOperation(id: string) {
  await tx("readwrite", (store) => store.delete(id));
  notify();
}

/** Elimina las operaciones ya confirmadas por el backend (más antiguas que 7 días). */
export async function pruneConfirmed(maxAgeDays = 7) {
  const limit = Date.now() - maxAgeDays * 86400000;
  for (const op of await listOperations()) {
    const done = op.syncStatus === "sincronizada" || op.syncStatus === "ya_existia";
    if (done && new Date(op.localCreatedAt).getTime() < limit) await deleteOperation(op.id);
  }
}

export type EnqueueInput = {
  entityType: SyncEntityType;
  payload: Record<string, unknown>;
  priority?: SyncPriority;
  idempotencyKey?: string;
  organizationId?: string | null;
  locationId?: string | null;
  pointOfSaleId?: string | null;
  cashSessionId?: string | null;
  businessDate?: string;
  currency?: string | null;
  amount?: number | null;
  label?: string | undefined;
};

export async function enqueueOperation(input: EnqueueInput): Promise<PendingOperation> {
  const op: PendingOperation = {
    id: crypto.randomUUID(),
    entityType: input.entityType,
    priority: input.priority ?? (input.entityType === "file" || input.entityType === "photo" ? "baja" : "alta"),
    payload: input.payload,
    idempotencyKey: input.idempotencyKey ?? crypto.randomUUID(),
    deviceId: deviceIdentifier(),
    organizationId: input.organizationId ?? null,
    locationId: input.locationId ?? null,
    pointOfSaleId: input.pointOfSaleId ?? null,
    cashSessionId: input.cashSessionId ?? null,
    businessDate: input.businessDate ?? new Date().toISOString().slice(0, 10),
    localSequence: nextLocalSequence(),
    localCreatedAt: new Date().toISOString(),
    syncStatus: "pendiente",
    attempts: 0,
    currency: input.currency ?? null,
    amount: input.amount ?? null,
    label: input.label,
  };
  await putOperation(op);
  return op;
}

type LegacySale = {
  id: string;
  createdAt: string;
  saleNumber: string;
  total: number;
  currency: string;
  sale: Record<string, unknown>;
  items: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  audit: Record<string, unknown>;
};

/** Migra la cola histórica de ventas de localStorage a IndexedDB (una sola vez). */
export async function migrateLegacyQueue() {
  if (!isBrowser()) return;
  const raw = window.localStorage.getItem(LEGACY_KEY);
  if (!raw) return;
  let legacy: LegacySale[] = [];
  try {
    legacy = JSON.parse(raw) as LegacySale[];
  } catch {
    window.localStorage.removeItem(LEGACY_KEY);
    return;
  }
  for (const entry of legacy) {
    await enqueueOperation({
      entityType: "sale",
      payload: { sale: entry.sale, items: entry.items, payments: entry.payments, audit: entry.audit },
      idempotencyKey: String(entry.sale["idempotency_key"] ?? entry.id),
      organizationId: (entry.sale["organization_id"] as string) ?? null,
      locationId: (entry.sale["location_id"] as string) ?? null,
      pointOfSaleId: (entry.sale["point_of_sale_id"] as string) ?? null,
      cashSessionId: (entry.sale["cash_session_id"] as string) ?? null,
      businessDate: entry.createdAt.slice(0, 10),
      currency: entry.currency,
      amount: entry.total,
      label: entry.saleNumber,
    });
  }
  window.localStorage.removeItem(LEGACY_KEY);
}
