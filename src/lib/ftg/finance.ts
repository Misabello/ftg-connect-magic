export type FinanceDocKind = "cobrar" | "pagar";
export type FinanceDocStatus = "pendiente" | "parcial" | "pagado" | "vencido" | "anulado";
export type CustomerKind = "corporativo" | "consumidor_final";
export type StockMovementKind =
  | "recepcion"
  | "ajuste"
  | "transferencia"
  | "venta"
  | "merma"
  | "devolucion";

export const FINANCE_STATUS_LABEL: Record<FinanceDocStatus, string> = {
  pendiente: "Pendiente",
  parcial: "Pago parcial",
  pagado: "Pagado",
  vencido: "Vencido",
  anulado: "Anulado",
};

export const FINANCE_STATUS_TONE: Record<FinanceDocStatus, string> = {
  pendiente: "bg-muted text-muted-foreground",
  parcial: "bg-warning/15 text-warning",
  pagado: "bg-success/10 text-success",
  vencido: "bg-destructive/10 text-destructive",
  anulado: "bg-muted text-muted-foreground line-through",
};

export const CUSTOMER_KIND_LABEL: Record<CustomerKind, string> = {
  corporativo: "Corporativo",
  consumidor_final: "Consumidor final",
};

export const MOVEMENT_LABEL: Record<StockMovementKind, string> = {
  recepcion: "Recepción",
  ajuste: "Ajuste",
  transferencia: "Transferencia",
  venta: "Venta",
  merma: "Merma / dañado",
  devolucion: "Devolución",
};

/** Signo con el que cada movimiento afecta el stock disponible. */
export const MOVEMENT_SIGN: Record<StockMovementKind, 1 | -1> = {
  recepcion: 1,
  ajuste: 1,
  transferencia: -1,
  venta: -1,
  merma: -1,
  devolucion: 1,
};

export function daysUntil(date: string | null) {
  if (!date) return null;
  const diff = new Date(`${date}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(diff / 86400000);
}

/** Tramos de antigüedad de deuda para cuentas por cobrar / pagar. */
export function agingBucket(dueOn: string | null) {
  const days = daysUntil(dueOn);
  if (days === null) return "Sin vencimiento";
  if (days >= 0) return "Por vencer";
  if (days >= -30) return "1 a 30 días";
  if (days >= -60) return "31 a 60 días";
  return "Más de 60 días";
}

export const AGING_ORDER = ["Por vencer", "1 a 30 días", "31 a 60 días", "Más de 60 días", "Sin vencimiento"];

export function balanceOf(doc: { amount: number; paid_amount: number }) {
  return Math.max(0, Number(doc.amount) - Number(doc.paid_amount));
}