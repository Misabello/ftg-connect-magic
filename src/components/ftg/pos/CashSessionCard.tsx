import { useState } from "react";
import { LockKeyhole, Unlock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney, relativeTime } from "@/lib/ftg/format";

export type CashSession = {
  id: string;
  opened_at: string;
  opening_amount: number;
  status: string;
  currency_code: string;
};

export function CashSessionCard({
  session,
  currency,
  locale,
  expectedAmount,
  salesCount,
  disabled,
  onOpen,
  onClose,
  busy,
}: {
  session: CashSession | null;
  currency: string;
  locale: string;
  expectedAmount: number;
  salesCount: number;
  disabled: boolean;
  onOpen: (amount: number) => void;
  onClose: (counted: number, notes: string) => void;
  busy: boolean;
}) {
  const [openingAmount, setOpeningAmount] = useState("0");
  const [countedAmount, setCountedAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);

  const difference = (Number(countedAmount) || 0) - expectedAmount;

  if (!session) {
    return (
      <div className="surface-card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-semibold">Caja cerrada</p>
          <p className="text-xs text-muted-foreground">
            Abrí la caja del punto de venta para poder registrar ventas.
          </p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={disabled}>
              <Unlock className="h-4 w-4" /> Abrir caja
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Abrir caja</DialogTitle>
              <DialogDescription>Registrá el fondo inicial disponible en el puesto.</DialogDescription>
            </DialogHeader>
            <div>
              <Label className="text-xs text-muted-foreground">Fondo inicial ({currency})</Label>
              <Input
                className="mt-1"
                type="number"
                min={0}
                step="0.01"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                disabled={busy}
                onClick={() => {
                  onOpen(Number(openingAmount) || 0);
                  setOpenDialog(false);
                }}
              >
                Abrir caja
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="surface-card flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="flex flex-wrap items-center gap-6">
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Caja abierta</p>
          <p className="text-sm font-semibold">{relativeTime(session.opened_at)}</p>
        </div>
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Fondo inicial</p>
          <p className="text-sm font-semibold">{formatMoney(session.opening_amount, currency, locale)}</p>
        </div>
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Ventas del turno</p>
          <p className="text-sm font-semibold">{salesCount}</p>
        </div>
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Efectivo esperado</p>
          <p className="text-sm font-semibold">{formatMoney(expectedAmount, currency, locale)}</p>
        </div>
      </div>

      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <LockKeyhole className="h-4 w-4" /> Cerrar caja
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cierre y arqueo</DialogTitle>
            <DialogDescription>
              Efectivo esperado: {formatMoney(expectedAmount, currency, locale)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Efectivo contado ({currency})</Label>
              <Input
                className="mt-1"
                type="number"
                min={0}
                step="0.01"
                value={countedAmount}
                onChange={(e) => setCountedAmount(e.target.value)}
              />
            </div>
            <p className={Math.abs(difference) < 0.01 ? "text-sm text-success" : "text-sm text-warning"}>
              Diferencia: {formatMoney(difference, currency, locale)}
            </p>
            <div>
              <Label className="text-xs text-muted-foreground">Observaciones</Label>
              <Textarea
                className="mt-1"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Diferencias, incidentes o retiros del turno"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={busy || countedAmount === ""}
              onClick={() => {
                onClose(Number(countedAmount) || 0, notes);
                setCloseDialog(false);
                setCountedAmount("");
                setNotes("");
              }}
            >
              Cerrar caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}