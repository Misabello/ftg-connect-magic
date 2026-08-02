/** Utilidades para enviar comprobantes y recuerdos por email o WhatsApp. */

export function sanitizePhone(phone: string | null | undefined) {
  return (phone ?? "").replace(/[^\d]/g, "");
}

export function whatsappLink(phone: string | null | undefined, message: string) {
  const digits = sanitizePhone(phone);
  const base = digits ? `https://wa.me/${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function mailtoLink(email: string | null | undefined, subject: string, body: string) {
  return `mailto:${email ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export type ReceiptShareData = {
  saleNumber: string;
  totalLabel: string;
  items: { name: string; quantity: number }[];
  customerName?: string | null | undefined;
  sellerName?: string | null | undefined;
  sellerPhone?: string | null | undefined;
  posName?: string | null | undefined;
};

/** Texto del comprobante para enviar al cliente. */
export function buildReceiptMessage(data: ReceiptShareData) {
  const lines = [
    `Hola${data.customerName ? ` ${data.customerName}` : ""}, ¡gracias por tu compra en FTG!`,
    "",
    `Comprobante: ${data.saleNumber}`,
    data.posName ? `Punto de venta: ${data.posName}` : null,
    "",
    "Detalle:",
    ...data.items.map((i) => `• ${i.quantity} × ${i.name}`),
    "",
    `Total: ${data.totalLabel}`,
    "",
    data.sellerName ? `Te atendió: ${data.sellerName}` : null,
    data.sellerPhone ? `Consultas por WhatsApp: ${data.sellerPhone}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

/** Texto para compartir un recuerdo generado con IA. */
export function buildSouvenirMessage(opts: {
  label: string;
  link?: string | null | undefined;
  sellerName?: string | null | undefined;
  sellerPhone?: string | null | undefined;
}) {
  return [
    `¡Tu ${opts.label} de FTG está listo!`,
    opts.link ? `\nDescargalo acá: ${opts.link}` : "\nTe lo entregamos en el punto de venta.",
    opts.sellerName ? `\nTe atendió: ${opts.sellerName}` : "",
    opts.sellerPhone ? `\nWhatsApp: ${opts.sellerPhone}` : "",
  ].join("");
}
