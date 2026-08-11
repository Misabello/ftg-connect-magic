import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { sha256Hex, verifySignature } from "@/lib/ftg/invoice-signature";

/**
 * Endpoint público firmado que recibe los correos con facturas recolectados
 * por el Apps Script de Gmail. El script NUNCA usa credenciales privilegiadas:
 * sólo firma cada solicitud con HMAC-SHA256 usando INVOICE_INGEST_SECRET.
 *
 * Cabeceras requeridas:
 *  - x-ftg-timestamp   segundos epoch
 *  - x-ftg-request-id  identificador único de la solicitud (anti-repetición)
 *  - x-ftg-signature   hex(HMAC_SHA256(secret, `${timestamp}.${requestId}.${body}`))
 */

const Attachment = z.object({
  filename: z.string().min(1).max(300),
  mimeType: z.string().min(3).max(120),
  sha256: z.string().length(64),
  size: z.number().int().nonnegative().max(25 * 1024 * 1024),
  contentBase64: z.string().min(10),
});

const Payload = z.object({
  accountEmail: z.string().email(),
  gmailMessageId: z.string().min(1).max(200),
  gmailThreadId: z.string().max(200).optional().nullable(),
  sender: z.string().max(320).optional().nullable(),
  recipients: z.array(z.string().max(320)).max(50).default([]),
  subject: z.string().max(500).optional().nullable(),
  receivedAt: z.string().max(40).optional().nullable(),
  bodySnippet: z.string().max(4000).optional().nullable(),
  countryCode: z.string().length(2).optional().nullable(),
  attachments: z.array(Attachment).max(10).default([]),
});

function base64ToBytes(value: string) {
  const binary = atob(value.replace(/\s/g, ""));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const Route = createFileRoute("/api/public/invoices/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["INVOICE_INGEST_SECRET"];
        if (!secret) return json({ error: "ingest_not_configured" }, 503);

        const timestamp = request.headers.get("x-ftg-timestamp") ?? "";
        const requestId = request.headers.get("x-ftg-request-id") ?? "";
        const signature = (request.headers.get("x-ftg-signature") ?? "").toLowerCase();
        const raw = await request.text();

        if (!timestamp || !requestId || !signature) return json({ error: "missing_signature" }, 401);
        if (raw.length > 30 * 1024 * 1024) return json({ error: "payload_too_large" }, 413);

        const verified = await verifySignature({ secret, timestamp, requestId, signature, body: raw });
        if (!verified.ok) return json({ error: verified.reason }, 401);

        let payload: z.infer<typeof Payload>;
        try {
          payload = Payload.parse(JSON.parse(raw));
        } catch {
          return json({ error: "invalid_payload" }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Anti-repetición: el mismo request_id nunca se procesa dos veces.
        const { error: replayError } = await supabaseAdmin
          .from("email_ingestion_requests")
          .insert({ request_id: requestId });
        if (replayError) return json({ error: "duplicate_request", ok: true }, 200);

        const { data: account } = await supabaseAdmin
          .from("email_ingestion_accounts")
          .select("*")
          .eq("email_address", payload.accountEmail)
          .eq("active", true)
          .maybeSingle();
        if (!account) return json({ error: "unknown_account" }, 404);

        if (
          account.allowed_senders.length > 0 &&
          !account.allowed_senders.some((s: string) =>
            (payload.sender ?? "").toLowerCase().includes(s.toLowerCase()),
          )
        ) {
          return json({ error: "sender_not_allowed" }, 403);
        }

        // El correo se registra siempre, aun sin adjuntos válidos.
        const { data: event, error: eventError } = await supabaseAdmin
          .from("email_ingestion_events")
          .upsert(
            {
              account_id: account.id,
              organization_id: account.organization_id,
              gmail_message_id: payload.gmailMessageId,
              gmail_thread_id: payload.gmailThreadId ?? null,
              sender: payload.sender ?? null,
              recipients: payload.recipients,
              subject: payload.subject ?? null,
              body_snippet: (payload.bodySnippet ?? "").slice(0, 4000),
              received_at: payload.receivedAt ?? new Date().toISOString(),
              attachment_count: payload.attachments.length,
              status: "procesando",
              request_id: requestId,
              signature_verified: true,
            },
            { onConflict: "account_id,gmail_message_id" },
          )
          .select("id")
          .single();
        if (eventError || !event) return json({ error: "event_write_failed" }, 500);

        const results: Array<{ filename: string; documentId: string | null; duplicate: boolean; error?: string }> = [];
        const maxBytes = account.max_attachment_mb * 1024 * 1024;

        for (const file of payload.attachments) {
          if (!account.allowed_mime_types.includes(file.mimeType)) {
            results.push({ filename: file.filename, documentId: null, duplicate: false, error: "mime_not_allowed" });
            continue;
          }
          const bytes = base64ToBytes(file.contentBase64);
          if (bytes.byteLength > maxBytes) {
            results.push({ filename: file.filename, documentId: null, duplicate: false, error: "file_too_large" });
            continue;
          }
          const hash = await sha256Hex(bytes);
          if (hash !== file.sha256.toLowerCase()) {
            results.push({ filename: file.filename, documentId: null, duplicate: false, error: "hash_mismatch" });
            continue;
          }

          const { data: existing } = await supabaseAdmin
            .from("invoice_documents")
            .select("id")
            .eq("organization_id", account.organization_id)
            .eq("file_hash", hash)
            .maybeSingle();

          if (existing) {
            await supabaseAdmin
              .from("invoice_email_links")
              .insert({ invoice_document_id: existing.id, email_ingestion_event_id: event.id });
            await supabaseAdmin.from("invoice_alerts").insert({
              organization_id: account.organization_id,
              invoice_document_id: existing.id,
              email_ingestion_event_id: event.id,
              alert_type: "factura_duplicada",
              severity: "media",
              message: `El archivo ${file.filename} ya estaba registrado. No se creó otro movimiento.`,
            });
            results.push({ filename: file.filename, documentId: existing.id, duplicate: true });
            continue;
          }

          const path = `${account.organization_id}/${new Date().toISOString().slice(0, 10)}/${hash.slice(0, 12)}-${file.filename}`;
          const { error: uploadError } = await supabaseAdmin.storage
            .from("invoice-inbox")
            .upload(path, bytes, { contentType: file.mimeType, upsert: true });
          if (uploadError) {
            await supabaseAdmin.from("invoice_alerts").insert({
              organization_id: account.organization_id,
              email_ingestion_event_id: event.id,
              alert_type: "error_storage",
              severity: "alta",
              message: `No se pudo guardar ${file.filename}: ${uploadError.message}`,
            });
            results.push({ filename: file.filename, documentId: null, duplicate: false, error: "storage_failed" });
            continue;
          }

          const { data: doc, error: docError } = await supabaseAdmin
            .from("invoice_documents")
            .insert({
              organization_id: account.organization_id,
              legal_entity_id: account.legal_entity_id,
              country_code: payload.countryCode ?? account.country_code,
              storage_bucket: "invoice-inbox",
              storage_path: path,
              file_name: file.filename,
              mime_type: file.mimeType,
              file_hash: hash,
              issuer_name: payload.sender ?? null,
              extraction_status: "pendiente",
              approval_status: "recibida",
            })
            .select("id")
            .single();
          if (docError || !doc) {
            results.push({ filename: file.filename, documentId: null, duplicate: false, error: "document_failed" });
            continue;
          }

          await supabaseAdmin
            .from("invoice_email_links")
            .insert({ invoice_document_id: doc.id, email_ingestion_event_id: event.id });
          await supabaseAdmin
            .from("invoice_processing_jobs")
            .insert({ invoice_document_id: doc.id, status: "pendiente", provider: "lovable-ai" });
          results.push({ filename: file.filename, documentId: doc.id, duplicate: false });
        }

        const anyOk = results.some((r) => r.documentId && !r.duplicate);
        const anyError = results.some((r) => r.error);
        await supabaseAdmin
          .from("email_ingestion_events")
          .update({
            status: anyError && !anyOk ? "error" : results.every((r) => r.duplicate) && results.length > 0 ? "duplicado" : "procesado",
            processed_at: new Date().toISOString(),
            error_message: anyError ? results.filter((r) => r.error).map((r) => `${r.filename}: ${r.error}`).join(" · ") : null,
          })
          .eq("id", event.id);
        await supabaseAdmin
          .from("email_ingestion_accounts")
          .update({ last_checked_at: new Date().toISOString() })
          .eq("id", account.id);

        return json({
          ok: true,
          eventId: event.id,
          // El Apps Script usa esta etiqueta para mover el correo.
          label: anyError && !anyOk ? "error" : results.some((r) => r.duplicate) ? "review" : "processed",
          results,
        });
      },
    },
  },
});