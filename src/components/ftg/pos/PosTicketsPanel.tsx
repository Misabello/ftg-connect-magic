import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, ExternalLink, Eye, ReceiptText, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/ftg/format";

export type TicketRow = {
  id: string;
  kind: string;
  amount: number;
  tax_amount: number;
  document_number: string | null;
  supplier_name: string | null;
  issued_on: string | null;
  image_path: string;
  created_at: string;
  journal_entry_id: string | null;
  drive_url: string | null;
};

/** Comprobantes cargados con OCR en el punto de venta, con visor del archivo original. */
export function PosTicketsPanel({
  pointOfSaleId,
  currency,
  locale,
}: {
  pointOfSaleId: string;
  currency: string;
  locale: string;
}) {
  const queryClient = useQueryClient();
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ ticket: TicketRow; url: string } | null>(null);

  const {
    data: tickets = [],
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["pos-tickets", pointOfSaleId],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from("pos_tickets")
        .select(
          "id, kind, amount, tax_amount, document_number, supplier_name, issued_on, image_path, created_at, journal_entry_id, drive_url",
        )
        .eq("point_of_sale_id", pointOfSaleId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (err) throw err;
      return (data ?? []) as TicketRow[];
    },
  });

  async function openTicket(ticket: TicketRow) {
    setOpeningId(ticket.id);
    setError(null);
    const { data, error: err } = await supabase.storage
      .from("pos-tickets")
      .createSignedUrl(ticket.image_path, 60 * 10);
    setOpeningId(null);
    if (data?.signedUrl) setPreview({ ticket, url: data.signedUrl });
    else setError(err?.message ?? "No se pudo abrir el archivo del comprobante.");
  }

  const isPdf = preview?.ticket.image_path.toLowerCase().endsWith(".pdf") ?? false;

  return (
    <section className="surface-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <ReceiptText className="h-4 w-4 text-primary" /> Comprobantes cargados por OCR
        </h2>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => void queryClient.invalidateQueries({ queryKey: ["pos-tickets"] })}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Actualizar
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Cada ticket ingresado en este puesto queda con su archivo original y su asiento contable.
      </p>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      {queryError && (
        <p className="mt-3 text-xs text-destructive">
          No se pudieron cargar los comprobantes: {(queryError as Error).message}
        </p>
      )}

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Cargando comprobantes…</p>
      ) : tickets.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Todavía no cargaste tickets en este puesto.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {tickets.map((ticket) => (
            <li key={ticket.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {ticket.document_number ? `N° ${ticket.document_number}` : "Sin número de comprobante"}
                  {ticket.supplier_name ? ` · ${ticket.supplier_name}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ticket.kind === "gasto" ? "Gasto / compra" : "Ingreso extra"} · {ticket.issued_on ?? "sin fecha"}
                  {Number(ticket.tax_amount) > 0
                    ? ` · imp. ${formatMoney(Number(ticket.tax_amount), currency, locale)}`
                    : ""}
                  {ticket.journal_entry_id ? " · asiento registrado" : " · sin asiento contable"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-medium">{formatMoney(Number(ticket.amount), currency, locale)}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => void openTicket(ticket)}
                  disabled={openingId === ticket.id}
                >
                  <Eye className="h-3.5 w-3.5" />
                  {openingId === ticket.id ? "Abriendo…" : "Ver ticket"}
                </Button>
                {ticket.drive_url ? (
                  <Button size="sm" variant="ghost" className="gap-1.5" asChild>
                    <a href={ticket.drive_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" /> Drive
                    </a>
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Ticket {preview?.ticket.document_number ? `N° ${preview.ticket.document_number}` : "sin número"}
              {preview?.ticket.supplier_name ? ` · ${preview.ticket.supplier_name}` : ""}
            </DialogTitle>
          </DialogHeader>
          {preview ? (
            <div className="space-y-3">
              <div className="max-h-[65vh] overflow-auto rounded-xl border border-border bg-surface p-2">
                {isPdf ? (
                  <iframe src={preview.url} title="Comprobante" className="h-[65vh] w-full rounded-lg" />
                ) : (
                  <img
                    src={preview.url}
                    alt="Comprobante del ticket"
                    className="mx-auto w-full rounded-lg object-contain"
                  />
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {preview.ticket.issued_on ?? "sin fecha"} ·{" "}
                  {formatMoney(Number(preview.ticket.amount), currency, locale)}
                </span>
                <div className="flex gap-2">
                  {preview.ticket.drive_url ? (
                    <Button size="sm" variant="outline" className="gap-1.5" asChild>
                      <a href={preview.ticket.drive_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" /> Ver en Drive
                      </a>
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" className="gap-1.5" asChild>
                    <a href={preview.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" /> Abrir original
                    </a>
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" asChild>
                    <a href={preview.url} download>
                      <Download className="h-3.5 w-3.5" /> Descargar
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
