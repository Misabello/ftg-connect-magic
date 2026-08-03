import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  /** Imagen del ticket en data URL o URL firmada. */
  imageUrl: z.string().min(10).max(12_000_000),
});

export type TicketOcrResult = {
  amount: number | null;
  taxAmount: number | null;
  issuedOn: string | null;
  documentNumber: string | null;
  supplierName: string | null;
  taxId: string | null;
  confidence: number;
  rawText: string;
};

type ChatResponse = { choices?: Array<{ message?: { content?: string } }> };

const SYSTEM = `Sos un lector de tickets y facturas de Argentina y Brasil.
Devolvés SOLO un JSON válido, sin markdown ni explicaciones, con esta forma exacta:
{"amount": number|null, "taxAmount": number|null, "issuedOn": "YYYY-MM-DD"|null, "documentNumber": string|null, "supplierName": string|null, "taxId": string|null, "confidence": number, "rawText": string}
Reglas:
- "amount" es el TOTAL final pagado, en número, sin símbolos ni separadores de miles.
- "taxAmount" es el IVA/impuesto discriminado; null si no aparece.
- "confidence" es de 0 a 100 según la nitidez del ticket.
- "rawText" es el texto que pudiste leer, resumido en menos de 600 caracteres.`;

function parseJson(content: string): TicketOcrResult {
  const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  const parsed = JSON.parse(slice) as Partial<TicketOcrResult>;
  return {
    amount: typeof parsed.amount === "number" ? parsed.amount : null,
    taxAmount: typeof parsed.taxAmount === "number" ? parsed.taxAmount : null,
    issuedOn: parsed.issuedOn ?? null,
    documentNumber: parsed.documentNumber ?? null,
    supplierName: parsed.supplierName ?? null,
    taxId: parsed.taxId ?? null,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
    rawText: parsed.rawText ?? "",
  };
}

/** Lee un ticket con IA de visión y devuelve importe, impuesto, fecha y datos del emisor. */
export const readTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<TicketOcrResult> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Falta la clave del servicio de IA");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: "Leé este ticket y devolvé el JSON pedido." },
              { type: "image_url", image_url: { url: data.imageUrl } },
            ],
          },
        ],
      }),
    });

    if (response.status === 429) throw new Error("Límite de solicitudes alcanzado, probá en unos minutos");
    if (response.status === 402) throw new Error("Créditos de IA agotados en el espacio de trabajo");
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Error del servicio de IA (${response.status}) ${detail.slice(0, 200)}`);
    }

    const payload = (await response.json()) as ChatResponse;
    const content = payload.choices?.[0]?.message?.content ?? "";
    if (!content) throw new Error("La IA no devolvió lectura del ticket");
    try {
      return parseJson(content);
    } catch {
      throw new Error("No se pudo interpretar el ticket, cargá el importe manualmente");
    }
  });