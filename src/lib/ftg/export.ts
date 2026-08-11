/** Utilidades de exportación de tablas (CSV / Google Sheets). */

export type ExportRow = Record<string, string | number | null | undefined>;

const cell = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",;\n\t]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function toDelimited(rows: ExportRow[], headers: string[], sep: string): string {
  const lines = [headers.map(cell).join(sep)];
  for (const row of rows) lines.push(headers.map((h) => cell(row[h])).join(sep));
  return lines.join("\n");
}

export function toCsv(rows: ExportRow[], headers: string[]): string {
  return toDelimited(rows, headers, ",");
}

export function downloadCsv(filename: string, rows: ExportRow[], headers: string[]) {
  // BOM para que Excel/Sheets respeten los acentos.
  const blob = new Blob(["\uFEFF" + toCsv(rows, headers)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Copia la tabla en formato tabulado: se pega directo en Google Sheets o Excel. */
export async function copyForSheets(rows: ExportRow[], headers: string[]) {
  await navigator.clipboard.writeText(toDelimited(rows, headers, "\t"));
}

export const NEW_SHEET_URL = "https://sheets.new";
