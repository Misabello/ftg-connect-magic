import { Copy, Mail, MessageCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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

/** Envío del comprobante al cliente por email o WhatsApp después de cobrar. */
export function ReceiptShareDialog({
  open,
  onOpenChange,
  receipt,
  defaultEmail,
  defaultPhone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ReceiptShareData | null;
  defaultEmail: string;
  defaultPhone: string;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState(defaultPhone);

  if (!receipt) return null;
  const message = buildReceiptMessage(receipt);
  const attachments = receipt.items.filter((i) => i.link);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setEmail(defaultEmail);
          setPhone(defaultPhone);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar comprobante {receipt.saleNumber}</DialogTitle>
          <DialogDescription>
            Mandale al cliente la factura y todas las fotos y videos de esta compra por email o WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
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
