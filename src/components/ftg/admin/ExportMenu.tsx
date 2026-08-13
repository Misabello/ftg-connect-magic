import { Download, FileSpreadsheet, FileText, Table2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { copyForSheets, downloadCsv, downloadPdf, type ExportRow } from "@/lib/ftg/export";

type Props = {
  /** Nombre base del archivo, sin extensión. */
  filename: string;
  title: string;
  subtitle: string;
  headers: string[];
  rightAlign?: string[];
  /** Se resuelve al momento de exportar para respetar los filtros vigentes. */
  getRows: () => ExportRow[];
  disabled?: boolean;
};

export function ExportMenu({ filename, title, subtitle, headers, rightAlign, getRows, disabled }: Props) {
  const guard = (action: (rows: ExportRow[]) => void) => () => {
    const rows = getRows();
    if (rows.length === 0) {
      toast.error("No hay datos para exportar con los filtros actuales");
      return;
    }
    action(rows);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled}>
          <Download className="mr-1.5 h-4 w-4" /> Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{subtitle}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={guard((rows) => {
            downloadCsv(filename, rows, headers);
            toast.success(`CSV generado (${rows.length} filas)`);
          })}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Descargar CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={guard((rows) => {
            const ok = downloadPdf(title, subtitle, rows, headers, { rightAlign: rightAlign ?? [] });
            if (ok) toast.success("Abrimos la vista de impresión: elegí «Guardar como PDF»");
            else toast.error("El navegador bloqueó la ventana emergente. Habilitala para exportar el PDF.");
          })}
        >
          <FileText className="mr-2 h-4 w-4" /> Exportar a PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={guard(async (rows) => {
            try {
              await copyForSheets(rows, headers);
              toast.success("Copiado: pegalo en Google Sheets o Excel");
            } catch {
              toast.error("No pudimos acceder al portapapeles");
            }
          })}
        >
          <Table2 className="mr-2 h-4 w-4" /> Copiar para Sheets
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
