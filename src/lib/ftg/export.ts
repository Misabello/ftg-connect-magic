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

/** Genera un PDF imprimible (diálogo del navegador) con la tabla exportada. */
export function downloadPdf(
  title: string,
  subtitle: string,
  rows: ExportRow[],
  headers: string[],
  options?: { rightAlign?: string[] },
) {
  const esc = (v: unknown) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const right = new Set(options?.rightAlign ?? []);
  const body = rows
    .map(
      (r) =>
        `<tr>${headers
          .map((h) => `<td${right.has(h) ? ' class="r"' : ""}>${esc(r[h])}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8" />
<title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; margin: 28px; color: #14161a; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p.sub { font-size: 12px; color: #5b6270; margin: 0 0 18px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border-bottom: 1px solid #e3e6ec; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f4f6fa; text-transform: uppercase; font-size: 10px; letter-spacing: .04em; }
  td.r, th.r { text-align: right; }
  tfoot p { font-size: 10px; color: #7b8290; }
  @page { size: A4 landscape; margin: 12mm; }
</style></head><body>
<h1>${esc(title)}</h1>
<p class="sub">${esc(subtitle)}</p>
<table><thead><tr>${headers
    .map((h) => `<th${right.has(h) ? ' class="r"' : ""}>${esc(h)}</th>`)
    .join("")}</tr></thead><tbody>${body}</tbody></table>
<p class="sub" style="margin-top:16px">${rows.length} registros · generado ${new Date().toLocaleString("es-AR")}</p>
<script>window.onload = () => { window.focus(); window.print(); };<\/script>
</body></html>`;
  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
