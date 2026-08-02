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
          <DialogDescription>Mandale la factura al cliente por email o WhatsApp.</DialogDescription>
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
