/** Utilidades del cierre de caja del punto de venta. */

export const CLOSE_SENDER_EMAIL = "marianoisabello@pampai.com";

export type CloseItem = { description: string; quantity: number; total: number };
export type CloseMethod = { method: string; amount: number };

export type CloseSummary = {
  sessionId: string;
  posName: string;
  locationName: string | null;
  closedOn: string;
  currency: string;
  openingAmount: number;
  expectedAmount: number;
  countedAmount: number;
  differenceAmount: number;
  salesCount: number;
  salesTotal: number;
  items: CloseItem[];
  methods: CloseMethod[];
  journalEntryId: string | null;
  journalNote: string;
  subject: string;
  body: string;
  recipients: { full_name: string; email: string; phone?: string | null }[];
  notificationId: string | null;
};

const money = (value: number, currency: string) =>
  `${currency} ${value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Arma el asunto y el cuerpo del mail de cierre de caja. */
export function buildCloseEmail(input: {
  posName: string;
  locationName: string | null;
  closedOn: string;
  currency: string;
  openingAmount: number;
  expectedAmount: number;
  countedAmount: number;
  differenceAmount: number;
  salesCount: number;
  salesTotal: number;
  items: CloseItem[];
  methods: CloseMethod[];
  journalNote: string;
  closedByName?: string | null;
}) {
  const subject = `Cierre de caja ${input.posName} — ${input.closedOn}`;
  const body = [
    `Cierre de caja del punto de venta ${input.posName}${input.locationName ? ` (${input.locationName})` : ""}.`,
    `Fecha: ${input.closedOn}`,
    input.closedByName ? `Cerró: ${input.closedByName}` : null,
    "",
    `Ventas del turno: ${input.salesCount}`,
    `Total vendido: ${money(input.salesTotal, input.currency)}`,
    "",
    "Productos y servicios vendidos:",
    ...(input.items.length > 0
      ? input.items.map((i) => `• ${i.quantity} × ${i.description} — ${money(i.total, input.currency)}`)
      : ["• Sin ventas registradas en el turno"]),
    "",
    "Cobros por medio de pago:",
    ...(input.methods.length > 0
      ? input.methods.map((m) => `• ${m.method}: ${money(m.amount, input.currency)}`)
      : ["• Sin cobros registrados"]),
    "",
    `Fondo inicial: ${money(input.openingAmount, input.currency)}`,
    `Efectivo esperado: ${money(input.expectedAmount, input.currency)}`,
    `Efectivo contado: ${money(input.countedAmount, input.currency)}`,
    `Diferencia de arqueo: ${money(input.differenceAmount, input.currency)}`,
    "",
    input.journalNote,
    "",
    "FTG ONE · Notificación automática de cierre de caja",
  ]
    .filter((line) => line !== null)
    .join("\n");
  return { subject, body };
}