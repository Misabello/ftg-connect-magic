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
  items: { name: string; quantity: number; link?: string | null }[];
  customerName?: string | null | undefined;
  sellerName?: string | null | undefined;
  sellerPhone?: string | null | undefined;
  sellerEmail?: string | null | undefined;
  posName?: string | null | undefined;
};

/** Texto del comprobante para enviar al cliente. */
export function buildReceiptMessage(data: ReceiptShareData) {
  const downloads = data.items.filter((i) => i.link);
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
    ...(downloads.length > 0
      ? [
          "",
          "Tus fotos y videos (enlaces válidos por 7 días):",
          ...downloads.map((i) => `• ${i.name}: ${i.link}`),
        ]
      : []),
    "",
    data.sellerName ? `Te atendió: ${data.sellerName}` : null,
    data.sellerPhone ? `Consultas por WhatsApp: ${data.sellerPhone}` : null,
    data.sellerEmail ? `Consultas por email: ${data.sellerEmail}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

/** Texto para compartir un recuerdo generado con IA. */
export type InvoiceShareData = {
  concept: string;
  documentNumber?: string | null | undefined;
  totalLabel: string;
  dueOn?: string | null | undefined;
  customerName?: string | null | undefined;
  sellerEmail?: string | null | undefined;
};

/** Texto de la factura por cobrar para enviar al cliente. */
export function buildInvoiceMessage(data: InvoiceShareData) {
  return [
    `Hola${data.customerName ? ` ${data.customerName}` : ""}, te enviamos tu factura de FTG.`,
    "",
    data.documentNumber ? `Comprobante: ${data.documentNumber}` : null,
    `Concepto: ${data.concept}`,
    `Importe: ${data.totalLabel}`,
    data.dueOn ? `Vencimiento: ${data.dueOn}` : null,
    "",
    "Ante cualquier duda respondé este correo.",
    data.sellerEmail ? `Contacto: ${data.sellerEmail}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

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
