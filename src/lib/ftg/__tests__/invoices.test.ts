import { describe, expect, it } from "vitest";

import { hmacHex, sha256Hex, signaturePayload, verifySignature } from "@/lib/ftg/invoice-signature";
import { parseExtraction } from "@/lib/ftg/invoices.prompts";
import { validateInvoice, validateTaxId } from "@/lib/ftg/invoices";

const SECRET = "secreto-de-prueba";
const BODY = JSON.stringify({ accountEmail: "facturas@ftg.com", gmailMessageId: "abc" });

describe("firma del webhook de ingesta", () => {
  it("acepta una solicitud firmada correctamente", async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const requestId = "req-1";
    const signature = await hmacHex(SECRET, signaturePayload(timestamp, requestId, BODY));
    await expect(verifySignature({ secret: SECRET, timestamp, requestId, signature, body: BODY })).resolves.toEqual({ ok: true });
  });

  it("rechaza firmas inválidas, faltantes y vencidas", async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const bad = await verifySignature({ secret: SECRET, timestamp, requestId: "r", signature: "0".repeat(64), body: BODY });
    expect(bad).toEqual({ ok: false, reason: "invalid_signature" });

    const missing = await verifySignature({ secret: SECRET, timestamp, requestId: "", signature: "", body: BODY });
    expect(missing).toEqual({ ok: false, reason: "missing_signature" });

    const old = String(Math.floor(Date.now() / 1000) - 3600);
    const signature = await hmacHex(SECRET, signaturePayload(old, "r", BODY));
    const stale = await verifySignature({ secret: SECRET, timestamp: old, requestId: "r", signature, body: BODY });
    expect(stale).toEqual({ ok: false, reason: "stale_request" });
  });

  it("detecta duplicados por hash del archivo", async () => {
    const bytes = new TextEncoder().encode("contenido-de-la-factura");
    const a = await sha256Hex(bytes);
    const b = await sha256Hex(new TextEncoder().encode("contenido-de-la-factura"));
    const other = await sha256Hex(new TextEncoder().encode("otra factura"));
    expect(a).toBe(b);
    expect(a).not.toBe(other);
    expect(a).toHaveLength(64);
  });
});

describe("extracción con IA", () => {
  it("parsea la respuesta del modelo aunque venga con markdown", () => {
    const content = '```json\n{"direction":"proveedor","documentType":"factura_proveedor","countryCode":"AR","issuerTaxId":"30-71234567-8","documentNumber":"0001-00000123","netAmount":100,"taxAmount":21,"totalAmount":121,"confidence":92,"fields":{"total":{"value":"121","confidence":95,"source":"ocr","page":1}}}\n```';
    const parsed = parseExtraction(content);
    expect(parsed.direction).toBe("proveedor");
    expect(parsed.totalAmount).toBe(121);
    expect(parsed.fields["total"]?.source).toBe("ocr");
  });

  it("normaliza tipos desconocidos", () => {
    const parsed = parseExtraction('{"documentType":"algo_raro","confidence":10}');
    expect(parsed.documentType).toBe("no_reconocido");
    expect(parsed.lineItems).toEqual([]);
  });
});

describe("validaciones contables", () => {
  const base = {
    net_amount: 100,
    tax_amount: 21,
    total_amount: 121,
    currency_code: "ARS",
    issue_date: "2026-01-10",
    due_date: "2026-02-10",
    issuer_tax_id: "30712345678",
    document_number: "0001-00000123",
    country_code: "AR",
    confidence_score: 95,
  };

  it("no reporta problemas cuando el comprobante cierra", () => {
    expect(validateInvoice(base)).toEqual([]);
  });

  it("marca como crítico cuando el total no cierra", () => {
    const notes = validateInvoice({ ...base, total_amount: 200 });
    expect(notes.some((n) => n.level === "critical")).toBe(true);
  });

  it("avisa cuando la confianza es baja", () => {
    const notes = validateInvoice({ ...base, confidence_score: 40 });
    expect(notes.some((n) => n.message.includes("Confianza"))).toBe(true);
  });

  it("valida identificaciones fiscales por país", () => {
    expect(validateTaxId("AR", "30-71234567-8")).toBe(true);
    expect(validateTaxId("BR", "12.345.678/0001-95")).toBe(true);
    expect(validateTaxId("PT", "501964843")).toBe(true);
    expect(validateTaxId("AR", "123")).toBe(false);
  });
});