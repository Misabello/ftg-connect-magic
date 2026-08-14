import { useServerFn } from "@tanstack/react-start";
import { Mail, Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { ExportSheetButton } from "@/components/ftg/admin/ReportShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/ftg/format";
import { markCloseNotificationSent } from "@/lib/ftg/pos-close.functions";
import { CLOSE_SENDER_EMAIL, type CloseSummary } from "@/lib/ftg/pos-close";
import { mailtoLink, whatsappLink, sanitizePhone } from "@/lib/ftg/share";

const HEADERS = ["Concepto", "Cantidad", "Total"];

/** Resumen del cierre de caja: ajuste contable y notificación a los usuarios configurados. */
export function CashCloseSummaryDialog({
  open,
  onOpenChange,
  summary,
  locale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: CloseSummary | null;
  locale: string;
}) {
  const markSent = useServerFn(markCloseNotificationSent);
  if (!summary) return null;
  const currency = summary.currency;
  const phones = summary.recipients.map((r) => sanitizePhone(r.phone)).filter(Boolean);

  const registerSent = () => {
    if (summary.notificationId) {
      void markSent({ data: { notification_id: summary.notificationId } })
        .then(() => onOpenChange(false))
        .catch((e: Error) => toast.error("No pudimos registrar el envío", { description: e.message }));
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{summary.subject}</DialogTitle>
          <DialogDescription>
            {summary.journalNote} Emisor de la notificación: {CLOSE_SENDER_EMAIL}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: "Vendido", value: formatMoney(summary.salesTotal, currency, locale) },
            { label: "Esperado", value: formatMoney(summary.expectedAmount, currency, locale) },
            { label: "Contado", value: formatMoney(summary.countedAmount, currency, locale) },
            { label: "Diferencia", value: formatMoney(summary.differenceAmount, currency, locale) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-surface p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="text-sm font-semibold">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="max-h-56 space-y-3 overflow-auto">
          <div>
            <p className="text-xs font-semibold">Productos y servicios vendidos</p>
            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
              {summary.items.length === 0 && <li>Sin ventas registradas en el turno.</li>}
              {summary.items.map((i) => (
                <li key={i.description} className="flex justify-between gap-3">
                  <span className="truncate">
                    {i.quantity} × {i.description}
                  </span>
                  <span className="shrink-0">{formatMoney(i.total, currency, locale)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold">Cobros por medio de pago</p>
            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
              {summary.methods.length === 0 && <li>Sin cobros registrados.</li>}
              {summary.methods.map((m) => (
                <li key={m.method} className="flex justify-between gap-3">
                  <span>{m.method}</span>
                  <span>{formatMoney(m.amount, currency, locale)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold">Notificación a ({summary.recipients.length})</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.recipients.length > 0
                ? summary.recipients
                    .map((r) => `${r.full_name} <${r.email}>${r.phone ? ` · ${r.phone}` : ""}`)
                    .join(", ")
                : "Todavía no hay destinatarios configurados en Configuración › Notificaciones / Punto de venta."}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(summary.body);
                toast.success("Resumen del cierre copiado");
              }}
            >
              <Copy className="mr-1.5 h-4 w-4" /> Copiar
            </Button>
            <ExportSheetButton
              title={summary.subject}
              headers={HEADERS}
              getRows={() =>
                summary.items.map((i) => ({ Concepto: i.description, Cantidad: i.quantity, Total: i.total }))
              }
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={summary.recipients.length === 0}
              asChild={summary.recipients.length > 0}
              onClick={() => {
                void navigator.clipboard?.writeText(summary.body).catch(() => undefined);
                toast.success("Notificación por email preparada");
                registerSent();
              }}
            >
              {summary.recipients.length > 0 ? (
                <a href={mailtoLink(summary.recipients.map((r) => r.email).join(","), summary.subject, summary.body)}>
                  <Mail className="mr-1.5 h-4 w-4" /> Email
                </a>
              ) : (
                <span>
                  <Mail className="mr-1.5 h-4 w-4" /> Email
                </span>
              )}
            </Button>
            <Button
              disabled={phones.length === 0}
              asChild={phones.length > 0}
              onClick={() => {
                toast.success("Notificación por WhatsApp preparada");
                registerSent();
              }}
            >
              {phones.length > 0 ? (
                <a href={whatsappLink(phones[0], summary.body)} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
                </a>
              ) : (
                <span>
                  <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
                </span>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}