/** Prompt y parseo de la extracción de facturas (multipaís, sin reglas de un solo país). */

export type ExtractedField = {
  value: string | null;
  confidence: number;
  source: "texto" | "xml" | "ocr" | "ia";
  page: number | null;
};

export type InvoiceExtraction = {
  direction: "proveedor" | "cliente";
  documentType: string;
  countryCode: string | null;
  issuerName: string | null;
  issuerTaxId: string | null;
  receiverName: string | null;
  receiverTaxId: string | null;
  documentNumber: string | null;
  series: string | null;
  pointOfSale: string | null;
  issueDate: string | null;
  dueDate: string | null;
  currencyCode: string | null;
  exchangeRate: number | null;
  netAmount: number | null;
  taxAmount: number | null;
  withholdingAmount: number | null;
  perceptionAmount: number | null;
  totalAmount: number | null;
  paymentTerms: string | null;
  purchaseOrder: string | null;
  bankDetails: string | null;
  fiscalCode: string | null;
  costCenter: string | null;
  lineItems: Array<{ description: string; quantity: number | null; unitPrice: number | null; total: number | null }>;
  confidence: number;
  fields: Record<string, ExtractedField>;
};

const DOC_TYPES = [
  "factura_proveedor",
  "factura_cliente",
  "nota_credito_proveedor",
  "nota_credito_cliente",
  "nota_debito",
  "recibo",
  "comprobante_pago",
  "orden_compra",
  "no_reconocido",
];

export const EXTRACT_SYSTEM_PROMPT = `Sos un extractor de comprobantes fiscales multipaís (Argentina, Brasil, Portugal y otros).
Devolvés SOLO un JSON válido, sin markdown ni explicaciones, con esta forma:
{
 "direction": "proveedor"|"cliente",
 "documentType": ${DOC_TYPES.map((d) => `"${d}"`).join("|")},
 "countryCode": "AR"|"BR"|"PT"|otro ISO-2|null,
 "issuerName": string|null, "issuerTaxId": string|null,
 "receiverName": string|null, "receiverTaxId": string|null,
 "documentNumber": string|null, "series": string|null, "pointOfSale": string|null,
 "issueDate": "YYYY-MM-DD"|null, "dueDate": "YYYY-MM-DD"|null,
 "currencyCode": "ARS"|"BRL"|"EUR"|"USD"|null, "exchangeRate": number|null,
 "netAmount": number|null, "taxAmount": number|null, "withholdingAmount": number|null,
 "perceptionAmount": number|null, "totalAmount": number|null,
 "paymentTerms": string|null, "purchaseOrder": string|null, "bankDetails": string|null,
 "fiscalCode": string|null, "costCenter": string|null,
 "lineItems": [{"description": string, "quantity": number|null, "unitPrice": number|null, "total": number|null}],
 "confidence": number,
 "fields": { "<campo>": {"value": string|null, "confidence": number, "source": "texto"|"xml"|"ocr"|"ia", "page": number|null} }
}
Reglas:
- Números sin símbolos ni separadores de miles; coma decimal se convierte a punto.
- "direction" es "proveedor" cuando la empresa recibe la factura, "cliente" cuando la emite.
- Identificación fiscal según país: CUIT (AR), CNPJ/CPF (BR), NIF (PT). No la mezcles con el número de comprobante.
- Incluí en "fields" un detalle por cada campo relevante que hayas podido leer, con su confianza real.
- "confidence" global de 0 a 100 según la legibilidad del documento. Si dudás, bajá la confianza; nunca inventes datos.`;

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseExtraction(content: string): InvoiceExtraction {
  const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const parsed = JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned) as Record<string, unknown>;

  const rawFields = (parsed["fields"] ?? {}) as Record<string, Partial<ExtractedField>>;
  const fields: Record<string, ExtractedField> = {};
  for (const [name, field] of Object.entries(rawFields)) {
    fields[name] = {
      value: field?.value != null ? String(field.value).slice(0, 500) : null,
      confidence: typeof field?.confidence === "number" ? field.confidence : 0,
      source: field?.source ?? "ia",
      page: typeof field?.page === "number" ? field.page : null,
    };
  }

  const documentType = String(parsed["documentType"] ?? "no_reconocido");
  const str = (key: string) => (parsed[key] != null ? String(parsed[key]).slice(0, 300) : null);

  return {
    direction: parsed["direction"] === "cliente" ? "cliente" : "proveedor",
    documentType: DOC_TYPES.includes(documentType) ? documentType : "no_reconocido",
    countryCode: str("countryCode"),
    issuerName: str("issuerName"),
    issuerTaxId: str("issuerTaxId"),
    receiverName: str("receiverName"),
    receiverTaxId: str("receiverTaxId"),
    documentNumber: str("documentNumber"),
    series: str("series"),
    pointOfSale: str("pointOfSale"),
    issueDate: str("issueDate"),
    dueDate: str("dueDate"),
    currencyCode: str("currencyCode"),
    exchangeRate: num(parsed["exchangeRate"]),
    netAmount: num(parsed["netAmount"]),
    taxAmount: num(parsed["taxAmount"]),
    withholdingAmount: num(parsed["withholdingAmount"]),
    perceptionAmount: num(parsed["perceptionAmount"]),
    totalAmount: num(parsed["totalAmount"]),
    paymentTerms: str("paymentTerms"),
    purchaseOrder: str("purchaseOrder"),
    bankDetails: str("bankDetails"),
    fiscalCode: str("fiscalCode"),
    costCenter: str("costCenter"),
    lineItems: Array.isArray(parsed["lineItems"])
      ? (parsed["lineItems"] as Record<string, unknown>[]).slice(0, 100).map((l) => ({
          description: String(l["description"] ?? "").slice(0, 300),
          quantity: num(l["quantity"]),
          unitPrice: num(l["unitPrice"]),
          total: num(l["total"]),
        }))
      : [],
    confidence: num(parsed["confidence"]) ?? 0,
    fields,
  };
}