import { useEffect, useState } from "react";
import { Download, ExternalLink, LayoutDashboard, Table2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { copyForSheets, downloadCsv, type ExportRow } from "@/lib/ftg/export";

const STORAGE_KEY = "ftg.looker.report_url";
export const LOOKER_NEW_REPORT_URL = "https://lookerstudio.google.com/reporting/create";

/** Acepta la URL de edición o de vista y devuelve la variante /embed. */
function toEmbedUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!url.hostname.endsWith("lookerstudio.google.com") && !url.hostname.endsWith("datastudio.google.com")) {
      return null;
    }
    if (!url.pathname.startsWith("/embed")) url.pathname = `/embed${url.pathname}`;
    return url.toString();
  } catch {
    return null;
  }
}

export function LookerStudioPanel({
  rows,
  headers,
  fileBase,
}: {
  rows: ExportRow[];
  headers: string[];
  fileBase: string;
}) {
  const [saved, setSaved] = useState<string>("");
  const [draft, setDraft] = useState<string>("");

  useEffect(() => {
    const stored = typeof window === "undefined" ? "" : (window.localStorage.getItem(STORAGE_KEY) ?? "");
    setSaved(stored);
    setDraft(stored);
  }, []);

  const embed = toEmbedUrl(saved);

  const save = () => {
    const next = draft.trim();
    if (next && !toEmbedUrl(next)) {
      toast.error("Pegá un enlace de Looker Studio válido.");
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, next);
    setSaved(next);
    toast.success(next ? "Panel de Looker Studio vinculado." : "Enlace quitado.");
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="looker-url">Enlace del informe de Looker Studio</Label>
          <Input
            id="looker-url"
            placeholder="https://lookerstudio.google.com/reporting/xxxxxxxx/page/xxxx"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </div>
        <Button onClick={save} className="gap-1.5">
          <LayoutDashboard className="h-4 w-4" /> Vincular
        </Button>
        {saved && (
          <Button
            variant="ghost"
            className="gap-1.5"
            onClick={() => {
              setDraft("");
              window.localStorage.removeItem(STORAGE_KEY);
              setSaved("");
            }}
          >
            <Trash2 className="h-4 w-4" /> Quitar
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => downloadCsv(fileBase, rows, headers)}>
          <Download className="h-3.5 w-3.5" /> Descargar CSV (fuente de datos)
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={async () => {
            try {
              await copyForSheets(rows, headers);
              toast.success("Tabla copiada", { description: "Pegala en un Sheet y usalo como fuente en Looker." });
            } catch {
              toast.error("No se pudo copiar. Usá la descarga en CSV.");
            }
          }}
        >
          <Table2 className="h-3.5 w-3.5" /> Copiar para Sheets
        </Button>
        <Button size="sm" variant="ghost" className="gap-1.5" asChild>
          <a href={LOOKER_NEW_REPORT_URL} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5" /> Crear informe en Looker Studio
          </a>
        </Button>
      </div>

      {embed ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <iframe
            title="Informe de Looker Studio"
            src={embed}
            className="h-[540px] w-full"
            frameBorder={0}
            allowFullScreen
            sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          Descargá el CSV o copiá la tabla, creá tu informe en Looker Studio y pegá acá el enlace del informe para verlo
          embebido dentro de FTG ONE. El informe debe estar compartido como “cualquiera con el enlace”.
        </div>
      )}
    </div>
  );
}
