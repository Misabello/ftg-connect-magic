/** Tipos y helpers compartidos del módulo "Automatización de facturas". */

export type InvoiceDirection = "proveedor" | "cliente";

export type InvoiceDocument = {
  id: string;
  organization_id: string;
  country_code: string | null;
  document_direction: InvoiceDirection;
  document_type: string;
  issuer_name: string | null;
  issuer_tax_id: string | null;
  receiver_name: string | null;
  receiver_tax_id: string | null;
  document_number: string | null;
  series: string | null;
  point_of_sale_code: string | null;
  issue_date: string | null;
  due_date: string | null;
  currency_code: string | null;
  exchange_rate: number | null;
  net_amount: number;
  tax_amount: number;
  withholding_amount: number;
  perception_amount: number;
  total_amount: number;
  payment_terms: string | null;
  purchase_order: string | null;
  bank_details: string | null;
  cost_center: string | null;
  supplier_id: string | null;
  customer_id: string | null;
  location_id: string | null;
  storage_bucket: string;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_hash: string | null;
  extraction_status: string;
  approval_status: string;
  confidence_score: number;
  duplicate_of: string | null;
  validation_notes: unknown;
  finance_document_id: string | null;
  created_at: string;
};

export const DOC_TYPE_LABEL: Record<string, string> = {
  factura_proveedor: "Factura de proveedor",
  factura_cliente: "Factura a cliente",
  nota_credito_proveedor: "NC de proveedor",
  nota_credito_cliente: "NC a cliente",
  nota_debito: "Nota de débito",
  recibo: "Recibo",
  comprobante_pago: "Comprobante de pago",
  orden_compra: "Orden de compra",
  no_reconocido: "No reconocido",
};

export const APPROVAL_LABEL: Record<string, string> = {
  recibida: "Recibida",
  procesando: "Procesando",
  requiere_revision: "Requiere revisión",
  pendiente_aprobacion: "Pendiente de aprobación",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  programada_pago: "Programada para pago",
  pagada: "Pagada",
  vencida: "Vencida",
  posible_duplicado: "Posible duplicado",
};

export const EXTRACTION_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  procesando: "Procesando",
  extraido: "Extraído",
  baja_confianza: "Baja confianza",
  error: "Error",
};

/** Umbral por debajo del cual nunca se aprueba sin revisión humana. */
export const LOW_CONFIDENCE = 80;

export type ValidationNote = { level: "info" | "warning" | "critical"; message: string };

/** Validaciones fiscales y contables básicas, independientes del país. */
export function validateInvoice(doc: {
  net_amount: number;
  tax_amount: number;
  withholding_amount?: number;
  perception_amount?: number;
  total_amount: number;
  currency_code: string | null;
  issue_date: string | null;
  due_date: string | null;
  issuer_tax_id: string | null;
  document_number: string | null;
  country_code: string | null;
  confidence_score?: number;
}): ValidationNote[] {
  const notes: ValidationNote[] = [];
  const sum =
    Number(doc.net_amount) +
    Number(doc.tax_amount) +
    Number(doc.perception_amount ?? 0) -
    Number(doc.withholding_amount ?? 0);
  if (doc.total_amount > 0 && Math.abs(sum - Number(doc.total_amount)) > 0.5) {
    notes.push({ level: "critical", message: `Neto + impuestos (${sum.toFixed(2)}) no coincide con el total (${Number(doc.total_amount).toFixed(2)}).` });
  }
  if (!doc.currency_code) notes.push({ level: "warning", message: "Falta la moneda del comprobante." });
  if (!doc.issue_date) notes.push({ level: "warning", message: "Falta la fecha de emisión." });
  if (doc.issue_date && doc.due_date && doc.due_date < doc.issue_date) {
    notes.push({ level: "critical", message: "El vencimiento es anterior a la emisión." });
  }
  if (!doc.document_number) notes.push({ level: "warning", message: "Falta el número de comprobante." });
  if (!doc.issuer_tax_id) {
    notes.push({ level: "warning", message: "Falta la identificación fiscal del emisor." });
  } else if (!validateTaxId(doc.country_code, doc.issuer_tax_id)) {
    notes.push({ level: "warning", message: `La identificación fiscal no tiene el formato esperado para ${doc.country_code ?? "el país"}.` });
  }
  if ((doc.confidence_score ?? 0) < LOW_CONFIDENCE) {
    notes.push({ level: "warning", message: "Confianza de extracción baja: revisá cada campo antes de aprobar." });
  }
  return notes;
}

/** Validadores fiscales por país (configurables, sin reglas embebidas en el OCR). */
export function validateTaxId(country: string | null, value: string): boolean {
  const digits = value.replace(/\D/g, "");
  switch (country) {
    case "AR":
      return digits.length === 11;
    case "BR":
      return digits.length === 14 || digits.length === 11;
    case "PT":
      return digits.length === 9;
    default:
      return digits.length >= 6;
  }
}

export const COUNTRY_RULES: Record<string, { taxIdLabel: string; currency: string; docTypes: string }> = {
  AR: { taxIdLabel: "CUIT", currency: "ARS", docTypes: "Factura A/B/C, NC/ND, CAE de ARCA" },
  BR: { taxIdLabel: "CNPJ / CPF", currency: "BRL", docTypes: "NF-e, NFS-e, série e número" },
  PT: { taxIdLabel: "NIF", currency: "EUR", docTypes: "Fatura, Nota de crédito, ATCUD" },
};