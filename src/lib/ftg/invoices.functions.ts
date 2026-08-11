import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EXTRACT_SYSTEM_PROMPT, parseExtraction, type InvoiceExtraction } from "@/lib/ftg/invoices.prompts";

const IdInput = z.object({ documentId: z.string().uuid() });

type ChatResponse = { choices?: Array<{ message?: { content?: string } }> };

/**
 * OCR + extracción con IA de un documento ya guardado en Storage.
 * La IA solamente propone: nunca cambia estados financieros por sí sola.
 */
export const extractInvoiceDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => IdInput.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true; confidence: number }> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Falta la clave del servicio de IA");

    const { supabase } = context;
    const { data: doc, error } = await supabase
      .from("invoice_documents")
      .select("id, storage_bucket, storage_path, mime_type, country_code, file_name")
      .eq("id", data.documentId)
      .single();
    if (error || !doc?.storage_path) throw new Error("No se encontró el documento");

    const started = Date.now();
    await supabase
      .from("invoice_documents")
      .update({ extraction_status: "procesando", approval_status: "procesando" })
      .eq("id", doc.id);
    await supabase
      .from("invoice_processing_jobs")
      .insert({
        invoice_document_id: doc.id,
        status: "procesando",
        provider: "lovable-ai",
        model: "google/gemini-3.6-flash",
        started_at: new Date().toISOString(),
      });

    const fail = async (message: string) => {
      await supabase.from("invoice_documents").update({ extraction_status: "error", approval_status: "requiere_revision" }).eq("id", doc.id);
      await supabase
        .from("invoice_processing_jobs")
        .update({ status: "error", error_message: message.slice(0, 500), completed_at: new Date().toISOString() })
        .eq("invoice_document_id", doc.id)
        .eq("status", "procesando");
      throw new Error(message);
    };

    const { data: signed } = await supabase.storage
      .from(doc.storage_bucket)
      .createSignedUrl(doc.storage_path, 600);
    if (!signed?.signedUrl) return fail("No se pudo leer el archivo almacenado") as never;

    const fileRes = await fetch(signed.signedUrl);
    if (!fileRes.ok) return fail("No se pudo descargar el archivo") as never;
    const buffer = new Uint8Array(await fileRes.arrayBuffer());
    const mime = doc.mime_type ?? "application/pdf";

    let userContent: unknown;
    if (mime.includes("xml")) {
      const xml = new TextDecoder().decode(buffer).slice(0, 120_000);
      userContent = [{ type: "text", text: `Extraé los datos de este XML fiscal:\n\n${xml}` }];
    } else {
      let binary = "";
      buffer.forEach((b) => {
        binary += String.fromCharCode(b);
      });
      const dataUrl = `data:${mime};base64,${btoa(binary)}`;
      userContent = [
        { type: "text", text: `Extraé los datos de este comprobante (${doc.file_name ?? ""}). País esperado: ${doc.country_code ?? "desconocido"}.` },
        { type: "image_url", image_url: { url: dataUrl } },
      ];
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: EXTRACT_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });
    if (response.status === 429) return fail("Límite de solicitudes de IA alcanzado") as never;
    if (response.status === 402) return fail("Créditos de IA agotados") as never;
    if (!response.ok) return fail(`Error del servicio de IA (${response.status})`) as never;

    const payload = (await response.json()) as ChatResponse;
    let parsed: InvoiceExtraction;
    try {
      parsed = parseExtraction(payload.choices?.[0]?.message?.content ?? "");
    } catch {
      return fail("No se pudo interpretar el documento") as never;
    }

    const lowConfidence = parsed.confidence < 80;
    await supabase
      .from("invoice_documents")
      .update({
        document_direction: parsed.direction,
        document_type: parsed.documentType as "no_reconocido",
        country_code: parsed.countryCode ?? doc.country_code,
        issuer_name: parsed.issuerName,
        issuer_tax_id: parsed.issuerTaxId,
        receiver_name: parsed.receiverName,
        receiver_tax_id: parsed.receiverTaxId,
        document_number: parsed.documentNumber,
        series: parsed.series,
        point_of_sale_code: parsed.pointOfSale,
        issue_date: parsed.issueDate,
        due_date: parsed.dueDate,
        currency_code: parsed.currencyCode,
        exchange_rate: parsed.exchangeRate,
        net_amount: parsed.netAmount ?? 0,
        tax_amount: parsed.taxAmount ?? 0,
        withholding_amount: parsed.withholdingAmount ?? 0,
        perception_amount: parsed.perceptionAmount ?? 0,
        total_amount: parsed.totalAmount ?? 0,
        payment_terms: parsed.paymentTerms,
        purchase_order: parsed.purchaseOrder,
        bank_details: parsed.bankDetails,
        fiscal_code: parsed.fiscalCode,
        cost_center: parsed.costCenter,
        line_items: parsed.lineItems,
        confidence_score: parsed.confidence,
        extraction_status: lowConfidence ? "baja_confianza" : "extraido",
        approval_status: "requiere_revision",
      })
      .eq("id", doc.id);

    const fields = Object.entries(parsed.fields ?? {}).map(([field_name, value]) => ({
      invoice_document_id: doc.id,
      field_name,
      extracted_value: value?.value ?? null,
      confidence: value?.confidence ?? parsed.confidence,
      extraction_source: value?.source ?? (mime.includes("xml") ? "xml" : "ia"),
      page_number: value?.page ?? null,
    }));
    if (fields.length > 0) {
      await supabase.from("invoice_extracted_fields").upsert(fields, { onConflict: "invoice_document_id,field_name" });
    }

    await supabase
      .from("invoice_processing_jobs")
      .update({
        status: lowConfidence ? "baja_confianza" : "extraido",
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - started,
      })
      .eq("invoice_document_id", doc.id)
      .eq("status", "procesando");

    return { ok: true, confidence: parsed.confidence };
  });

const ApproveInput = z.object({
  documentId: z.string().uuid(),
  supplierId: z.string().uuid().nullable().optional(),
  customerId: z.string().uuid().nullable().optional(),
  locationId: z.string().uuid().nullable().optional(),
  costCenter: z.string().max(120).nullable().optional(),
});

/**
 * Aprobación humana: recién acá se crea la cuenta por pagar o por cobrar.
 * Nunca se ejecuta de forma automática.
 */
export const approveInvoiceDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ApproveInput.parse(data))
  .handler(async ({ data, context }): Promise<{ financeDocumentId: string }> => {
    const { supabase, userId } = context;
    const { data: doc, error } = await supabase
      .from("invoice_documents")
      .select("*")
      .eq("id", data.documentId)
      .single();
    if (error || !doc) throw new Error("No se encontró el documento");
    if (doc.approval_status === "aprobada" || doc.finance_document_id) {
      throw new Error("El documento ya fue aprobado");
    }
    if (Number(doc.total_amount) <= 0) throw new Error("Completá el importe total antes de aprobar");

    const kind = doc.document_direction === "cliente" ? "cobrar" : "pagar";
    const { data: finance, error: financeError } = await supabase
      .from("finance_documents")
      .insert({
        organization_id: doc.organization_id,
        location_id: data.locationId ?? doc.location_id,
        kind,
        status: "pendiente",
        supplier_id: kind === "pagar" ? (data.supplierId ?? doc.supplier_id) : null,
        customer_id: kind === "cobrar" ? (data.customerId ?? doc.customer_id) : null,
        document_number: doc.document_number,
        concept: `${doc.issuer_name ?? "Comprobante"} · ${doc.document_number ?? doc.file_name ?? ""}`.slice(0, 200),
        cost_center: data.costCenter ?? doc.cost_center,
        currency_code: doc.currency_code ?? "ARS",
        amount: doc.total_amount,
        issued_on: doc.issue_date ?? new Date().toISOString().slice(0, 10),
        due_on: doc.due_date,
        receipt_path: doc.storage_path,
        created_by: userId,
      })
      .select("id")
      .single();
    if (financeError || !finance) throw new Error(financeError?.message ?? "No se pudo crear el movimiento");

    await supabase
      .from("invoice_documents")
      .update({
        approval_status: "aprobada",
        finance_document_id: finance.id,
        supplier_id: data.supplierId ?? doc.supplier_id,
        customer_id: data.customerId ?? doc.customer_id,
        location_id: data.locationId ?? doc.location_id,
        cost_center: data.costCenter ?? doc.cost_center,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", doc.id);

    await supabase.from("audit_logs").insert({
      organization_id: doc.organization_id,
      location_id: data.locationId ?? doc.location_id,
      user_id: userId,
      action: "factura_aprobada",
      entity: "invoice_documents",
      entity_id: doc.id,
      details: { finance_document_id: finance.id, kind, total: doc.total_amount },
    });

    return { financeDocumentId: finance.id };
  });