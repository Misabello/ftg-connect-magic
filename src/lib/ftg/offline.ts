import { supabase } from "@/integrations/supabase/client";

/** Venta capturada en el dispositivo mientras no había conexión. */
export type PendingSale = {
  id: string;
  createdAt: string;
  saleNumber: string;
  posCode: string;
  total: number;
  currency: string;
  sale: Record<string, unknown>;
  items: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  audit: Record<string, unknown>;
  attempts: number;
  lastError?: string | null;
};

const KEY = "ftg.offline.sales";
const EVENT = "ftg:offline-queue";

const isBrowser = () => typeof window !== "undefined";

export function readQueue(): PendingSale[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingSale[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingSale[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function subscribeQueue(listener: () => void) {
  if (!isBrowser()) return () => {};
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export function enqueueSale(entry: Omit<PendingSale, "id" | "createdAt" | "attempts">) {
  const pending: PendingSale = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  writeQueue([...readQueue(), pending]);
  return pending;
}

function removeFromQueue(id: string) {
  writeQueue(readQueue().filter((p) => p.id !== id));
}

function markFailure(id: string, message: string) {
  writeQueue(readQueue().map((p) => (p.id === id ? { ...p, attempts: p.attempts + 1, lastError: message } : p)));
}

/** Envía una venta pendiente. La clave de idempotencia evita duplicados al reintentar. */
async function pushSale(pending: PendingSale) {
  const existing = await supabase
    .from("sales")
    .select("id")
    .eq("idempotency_key", String(pending.sale["idempotency_key"]))
    .maybeSingle();

  if (!existing.data?.id) {
    const { data, error } = await supabase
      .from("sales")
      .insert(pending.sale as never)
      .select("id")
      .single();
    if (error) throw error;
    const saleId = data.id;

    const { error: itemsError } = await supabase
      .from("sale_items")
      .insert(pending.items.map((i) => ({ ...i, sale_id: saleId })) as never);
    if (itemsError) throw itemsError;

    const { error: paymentsError } = await supabase
      .from("sale_payments")
      .insert(pending.payments.map((p) => ({ ...p, sale_id: saleId })) as never);
    if (paymentsError) throw paymentsError;

    await supabase.from("audit_logs").insert({ ...pending.audit, entity_id: saleId } as never);
  }

  removeFromQueue(pending.id);
}

export type SyncResult = { synced: number; failed: number };

/** Sincroniza por lotes todas las ventas pendientes del dispositivo. */
export async function syncQueue(): Promise<SyncResult> {
  let synced = 0;
  let failed = 0;
  for (const pending of readQueue()) {
    try {
      await pushSale(pending);
      synced += 1;
    } catch (error) {
      failed += 1;
      markFailure(pending.id, error instanceof Error ? error.message : "Error desconocido");
    }
  }
  return { synced, failed };
}
