export type CatalogProduct = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  kind: string;
  tax_rate: number;
  requires_photo: boolean;
  category_id: string | null;
  price: number;
  includes_tax: boolean;
};

export type CartLine = {
  productId: string;
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  taxRate: number;
  includesTax: boolean;
  requiresPhoto: boolean;
  photoCode: string | null;
  /** Archivo entregable (foto o video) asociado a la línea. */
  mediaUrl?: string | null;
  mediaPath?: string | null;
  mediaBucket?: string | null;
};

export type CartTotals = {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
};

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/** Total bruto de una línea (con impuesto incluido si corresponde), ya descontado. */
export function lineGross(line: CartLine) {
  return round2(Math.max(line.unitPrice * line.quantity - line.discountAmount, 0));
}

/** Impuesto contenido en una línea. Los precios de lista incluyen impuesto. */
export function lineTax(line: CartLine) {
  const gross = lineGross(line);
  const rate = line.taxRate / 100;
  if (rate <= 0) return 0;
  return round2(line.includesTax ? gross - gross / (1 + rate) : gross * rate);
}

export function computeTotals(lines: CartLine[]): CartTotals {
  let gross = 0;
  let taxTotal = 0;
  let discountTotal = 0;
  for (const line of lines) {
    gross += lineGross(line);
    taxTotal += lineTax(line);
    discountTotal += line.discountAmount;
  }
  gross = round2(gross);
  taxTotal = round2(taxTotal);
  return {
    subtotal: round2(gross - taxTotal),
    discountTotal: round2(discountTotal),
    taxTotal,
    total: gross,
  };
}

export function paidTotal(payments: { amount: number }[]) {
  return round2(payments.reduce((acc, p) => acc + (Number.isFinite(p.amount) ? p.amount : 0), 0));
}

export function buildSaleNumber(posCode: string, sequence: number, date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${posCode}-${y}${m}${d}-${String(sequence).padStart(4, "0")}`;
}

/** Clave única por venta: permite reintentar la sincronización sin duplicar. */
export function newIdempotencyKey() {
  return crypto.randomUUID();
}