import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";

const schema = z.object({
  title: z.string().trim().min(1).max(120),
  headers: z.array(z.string()).min(1).max(60),
  rows: z.array(z.array(z.union([z.string(), z.number(), z.null()]))).max(5000),
  chart: z
    .object({
      title: z.string().trim().min(1).max(120),
      type: z.enum(["LINE", "COLUMN", "AREA"]).default("LINE"),
      domainHeader: z.string(),
      seriesHeaders: z.array(z.string()).min(1).max(10),
    })
    .optional(),
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
    const created = json as unknown as { sheets?: { properties?: { sheetId?: number } }[] };
    const dataSheetId = created.sheets?.[0]?.properties?.sheetId ?? 0;
    const spreadsheetId = json.spreadsheetId ?? null;

    let chartAdded = false;
    if (data.chart && spreadsheetId) {
      const idxOf = (h: string) => data.headers.indexOf(h);
      const domainIndex = idxOf(data.chart.domainHeader);
      const seriesIndexes = data.chart.seriesHeaders.map(idxOf).filter((i) => i >= 0);
      if (domainIndex >= 0 && seriesIndexes.length > 0) {
        const rowCount = data.rows.length + 1;
        const range = (col: number) => ({
          sources: [
            {
              sheetId: dataSheetId,
              startRowIndex: 0,
              endRowIndex: rowCount,
              startColumnIndex: col,
              endColumnIndex: col + 1,
            },
          ],
        });
        const chartRes = await fetch(`${GATEWAY_URL}/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": sheetsKey,
          },
          body: JSON.stringify({
            requests: [
              {
                addChart: {
                  chart: {
                    spec: {
                      title: data.chart.title,
                      basicChart: {
                        chartType: data.chart.type,
                        legendPosition: "BOTTOM_LEGEND",
                        headerCount: 1,
                        domains: [{ domain: range(domainIndex) }],
                        series: seriesIndexes.map((col) => ({
                          series: range(col),
                          targetAxis: "LEFT_AXIS",
                        })),
                      },
                    },
                    position: { newSheet: true },
                  },
                },
              },
            ],
          }),
        });
        if (chartRes.ok) {
          chartAdded = true;
        } else {
          const body = await chartRes.text();
          console.error(`Google Sheets chart error [${chartRes.status}]: ${body}`);
        }
      }
    }

    return {
      spreadsheet_id: spreadsheetId,
      url: json.spreadsheetUrl ?? (spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : null),
      rows: data.rows.length,
      chart_added: chartAdded,
    };
  });
