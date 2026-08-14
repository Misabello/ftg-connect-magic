import { Check, Copy, Mail, MessageCircle, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildReceiptMessage, mailtoLink, whatsappLink, type ReceiptShareData } from "@/lib/ftg/share";

export type SaleAssignment = {
  saleId: string | null;
  queued: boolean;
  posName: string;
  posCode: string;
  locationName: string | null;
  payments: { method: string; amount: number }[];
  items: { name: string; quantity: number; total: number }[];
};

/** Envío del comprobante al cliente por email o WhatsApp después de cobrar. */
export function ReceiptShareDialog({
  open,
  onOpenChange,
  receipt,
  defaultEmail,
  defaultPhone,
  assignment,
  currency,
  locale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ReceiptShareData | null;
  defaultEmail: string;
  defaultPhone: string;
  assignment?: SaleAssignment | null;
  currency?: string;
  locale?: string;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState(defaultPhone);
  const [assigned, setAssigned] = useState(false);
  const [assigning, setAssigning] = useState(false);

  if (!receipt) return null;
  const message = buildReceiptMessage(receipt);
  const attachments = receipt.items.filter((i) => i.link);
  const money = (value: number) =>
    `${currency ?? "ARS"} ${value.toLocaleString(locale ?? "es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const confirmAssignment = async () => {
    if (!assignment) return;
    setAssigning(true);
    try {
      if (assignment.saleId) {
        const { error } = await supabase
          .from("sales")
          .update({ status: "completada" })
          .eq("id", assignment.saleId);
        if (error) throw error;
      }
      setAssigned(true);
      toast.success(`Cobro asignado a ${assignment.posName}`, {
        description: assignment.queued
          ? "Queda pendiente de sincronizar y se asienta al volver en línea."
          : `${assignment.payments.map((p) => p.method).join(" + ")} · ${assignment.items.length} artículos`,
      });
    } catch (err) {
      toast.error("No se pudo confirmar la asignación", { description: (err as Error).message });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setEmail(defaultEmail);
          setPhone(defaultPhone);
          setAssigned(false);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar comprobante {receipt.saleNumber}</DialogTitle>
          <DialogDescription>
            Mandale al cliente la factura y todas las fotos y videos de esta compra por email o WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {assignment && (
            <div className="rounded-xl border border-border p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                <Store className="h-3.5 w-3.5 text-primary" /> Asignación al punto de venta
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {assignment.posName}
                {assignment.posCode ? ` · ${assignment.posCode}` : ""}
                {assignment.locationName ? ` · ${assignment.locationName}` : ""}
              </p>
              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {assignment.items.map((i) => (
                  <li key={i.name} className="flex justify-between gap-3">
                    <span className="truncate">
                      {i.quantity} × {i.name}
                    </span>
                    <span className="shrink-0">{money(i.total)}</span>
                  </li>
                ))}
              </ul>
              <ul className="mt-2 space-y-0.5 border-t border-border pt-2 text-xs">
                {assignment.payments.map((p) => (
                  <li key={p.method} className="flex justify-between gap-3">
                    <span>{p.method}</span>
                    <span className="font-medium">{money(p.amount)}</span>
                  </li>
                ))}
              </ul>
              <Button
                size="sm"
                variant={assigned ? "secondary" : "default"}
                className="mt-3 w-full"
                disabled={assigning || assigned}
                onClick={() => void confirmAssignment()}
              >
                <Check className="mr-1.5 h-4 w-4" />
                {assigned ? "Cobro asignado al punto de venta" : "Confirmar y asignar al punto de venta"}
              </Button>
            </div>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Email del cliente</Label>
            <Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">WhatsApp (con código de país)</Label>
            <Input className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5492235550000" />
          </div>
          <pre className="max-h-40 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">{message}</pre>
          {attachments.length > 0 ? (
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-medium">Archivos incluidos ({attachments.length})</p>
              <ul className="mt-2 space-y-1">
                {attachments.map((item) => (
                  <li key={item.name} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate">{item.name}</span>
                    <a
                      className="shrink-0 text-primary underline"
                      href={item.link!}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(message);
              toast.success("Comprobante copiado");
            }}
          >
            <Copy className="mr-1.5 h-4 w-4" /> Copiar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href={mailtoLink(email, `Comprobante ${receipt.saleNumber} — FTG`, message)}>
                <Mail className="mr-1.5 h-4 w-4" /> Email
              </a>
            </Button>
            <Button asChild>
              <a href={whatsappLink(phone, message)} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
              </a>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
