import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";

const schema = z.object({
  title: z.string().trim().min(1).max(120),
  headers: z.array(z.string()).min(1).max(60),
  rows: z.array(z.array(z.union([z.string(), z.number(), z.null()]))).max(5000),
});

/** Crea una planilla nueva en Google Sheets con los datos ya cargados. */
export const exportRowsToSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const sheetsKey = process.env["GOOGLE_SHEETS_API_KEY"];
    if (!lovableKey || !sheetsKey) {
      throw new Error("La conexión con Google Sheets no está configurada.");
    }

    const values = [data.headers, ...data.rows.map((r) => r.map((c) => (c === null ? "" : c)))];

    const response = await fetch(`${GATEWAY_URL}/spreadsheets`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": sheetsKey,
      },
      body: JSON.stringify({
        properties: { title: data.title },
        sheets: [
          {
            properties: { title: "Datos", gridProperties: { frozenRowCount: 1 } },
            data: [
              {
                startRow: 0,
                startColumn: 0,
                rowData: values.map((row) => ({
                  values: row.map((cell) =>
                    typeof cell === "number"
                      ? { userEnteredValue: { numberValue: cell } }
                      : { userEnteredValue: { stringValue: String(cell) } },
                  ),
                })),
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Google Sheets gateway error [${response.status}]: ${body}`);
      throw new Error(`No se pudo crear la planilla [${response.status}]: ${body.slice(0, 300)}`);
    }

    const json = (await response.json()) as { spreadsheetId?: string; spreadsheetUrl?: string };
    return {
      spreadsheet_id: json.spreadsheetId ?? null,
      url: json.spreadsheetUrl ?? (json.spreadsheetId ? `https://docs.google.com/spreadsheets/d/${json.spreadsheetId}/edit` : null),
      rows: data.rows.length,
    };
  });
