import { useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { ExportMenu } from "@/components/ftg/admin/ExportMenu";
import { PeriodSelect } from "@/components/ftg/admin/PeriodSelect";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useScope } from "@/hooks/useScope";
import type { ExportRow } from "@/lib/ftg/export";
import { exportRowsToSheet } from "@/lib/ftg/sheets.functions";

export const MAX_REPORT_ROWS = 2000;

/** Selector de sede reutilizable (usa las sedes visibles por RLS). */
export function LocationFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { locations } = useScope();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Sede" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas las sedes</SelectItem>
        {locations.map((l) => (
          <SelectItem key={l.id} value={l.id}>
            {l.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SimpleFilter({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-52">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ExportSheetButton({
  title,
  headers,
  getRows,
}: {
  title: string;
  headers: string[];
  getRows: () => ExportRow[];
}) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const createSheet = useServerFn(exportRowsToSheet);

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          const rows = getRows();
          if (rows.length === 0) {
            toast.error("No hay datos para exportar con los filtros actuales");
            return;
          }
          setBusy(true);
          try {
            const res = await createSheet({
              data: {
                title: `FTG · ${title}`,
                headers,
                rows: rows.map((r) => headers.map((h) => (r[h] === undefined || r[h] === null ? "" : r[h]!))),
              },
            });
            if (res.url) {
              setUrl(res.url);
              window.open(res.url, "_blank", "noopener");
              toast.success("Planilla creada en Google Sheets", { description: `${res.rows} filas exportadas.` });
            } else {
              toast.error("La planilla se creó pero no se obtuvo el enlace.");
            }
          } catch (err) {
            toast.error("No se pudo exportar a Google Sheets", { description: (err as Error).message });
          } finally {
            setBusy(false);
          }
        }}
      >
        <ExternalLink className="mr-1.5 h-4 w-4" /> {busy ? "Exportando…" : "Exportar a Sheets"}
      </Button>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
          Abrir planilla
        </a>
      )}
    </div>
  );
}

type Props = {
  title: string;
  description: string;
  filename: string;
  headers: string[];
  rightAlign?: string[];
  rows: ExportRow[];
  loading?: boolean;
  error?: unknown;
  filters?: ReactNode;
  subtitle?: string;
};

export function ReportShell({
  title,
  description,
  filename,
  headers,
  rightAlign,
  rows,
  loading,
  error,
  filters,
  subtitle,
}: Props) {
  const sub = subtitle ?? description;
  return (
    <section className="surface-card p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportMenu
            filename={filename}
            title={title}
            subtitle={sub}
            headers={headers}
            rightAlign={rightAlign ?? []}
            getRows={() => rows}
          />
          <ExportSheetButton title={title} headers={headers} getRows={() => rows} />
        </div>
      </header>

      {filters && <div className="mt-4 flex flex-wrap items-center gap-2">{filters}</div>}

      <div className="mt-4 overflow-x-auto">
        {error ? (
          <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center text-sm text-destructive">
            No pudimos cargar el reporte. {(error as Error)?.message}
          </p>
        ) : loading ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Cargando datos…
          </p>
        ) : rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No hay registros para los filtros seleccionados.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((h) => (
                  <TableHead key={h} className={rightAlign?.includes(h) ? "text-right" : undefined}>
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  {headers.map((h) => (
                    <TableCell key={h} className={rightAlign?.includes(h) ? "text-right tabular-nums" : undefined}>
                      {row[h] ?? "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {rows.length >= MAX_REPORT_ROWS && (
        <p className="mt-3 text-xs text-muted-foreground">
          Mostrando las primeras {MAX_REPORT_ROWS} filas: acotá el período para ver menos registros.
        </p>
      )}
    </section>
  );
}

export { PeriodSelect };
