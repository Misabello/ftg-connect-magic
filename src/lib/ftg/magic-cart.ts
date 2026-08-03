/** Cola local de recuerdos IA aprobados y listos para cobrar en el punto de venta. */

export type MagicPendingItem = {
  id: string;
  jobId: string;
  outputType: "imagen" | "video";
  label: string;
  price: number;
  locationId: string | null;
  mediaUrl: string | null;
  /** Ruta en storage para regenerar un link de descarga largo al cobrar. */
  mediaPath?: string | null;
  mediaBucket?: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  createdAt: string;
  /** Producto real del catálogo cuando el ítem no es un recuerdo IA. */
  productId?: string | null;
  sku?: string | null;
  /** Código de visitante u otra referencia de la fotografía. */
  photoCode?: string | null;
};

const KEY = "ftg.pos.magic-items";
const EVENT = "ftg:magic-items";
const OPEN_EVENT = "ftg:open-cart";

function read(): MagicPendingItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as MagicPendingItem[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: MagicPendingItem[]) {
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function listMagicItems() {
  return read();
}

export function addMagicItem(item: Omit<MagicPendingItem, "id" | "createdAt">) {
  const full: MagicPendingItem = { ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  write([full, ...read()].slice(0, 30));
  return full;
}

export function removeMagicItem(id: string) {
  write(read().filter((i) => i.id !== id));
}

export function subscribeMagicItems(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

/** Abre el panel de carrito de la barra superior desde cualquier módulo. */
export function openCartDock() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export function subscribeCartDockOpen(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(OPEN_EVENT, listener);
  return () => window.removeEventListener(OPEN_EVENT, listener);
}
