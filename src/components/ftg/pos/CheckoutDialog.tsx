import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/ftg/format";
import { paidTotal } from "@/lib/ftg/pos";

export type PaymentMethodRow = {
  id: string;
  code: string;
  name: string;
  kind: string;
  requires_reference: boolean;
};

export type PaymentDraft = {
  key: string;
  methodId: string;
  amount: number;
  reference: string;
};

export type CheckoutCustomer = { name: string; taxId: string; email: string };

export function CheckoutDialog({
  open,
  onOpenChange,
  total,
  currency,
  locale,
  methods,
  submitting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  currency: string;
  locale: string;
  methods: PaymentMethodRow[];
  submitting: boolean;
  onConfirm: (payments: PaymentDraft[], customer: CheckoutCustomer) => void;
}) {
  const [payments, setPayments] = useState<PaymentDraft[]>([]);
  const [customer, setCustomer] = useState<CheckoutCustomer>({ name: "", taxId: "", email: "" });

  useEffect(() => {
    if (!open) return;
    const first = methods[0];
    setPayments(
      first ? [{ key: crypto.randomUUID(), methodId: first.id, amount: total, reference: "" }] : [],
    );
    setCustomer({ name: "", taxId: "", email: "" });
  }, [open, methods, total]);

  const paid = paidTotal(payments);
  const pending = Math.round((total - paid + Number.EPSILON) * 100) / 100;

  const missingReference = useMemo(
    () =>
      payments.some((p) => {
        const method = methods.find((m) => m.id === p.methodId);
        return method?.requires_reference && p.reference.trim().length === 0;
      }),
    [payments, methods],
  );

  const canConfirm = payments.length > 0 && Math.abs(pending) < 0.01 && !missingReference && !submitting;

  const update = (key: string, patch: Partial<PaymentDraft>) =>
    setPayments((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cobrar {formatMoney(total, currency, locale)}</DialogTitle>
          <DialogDescription>
            Podés combinar varios medios de pago. La factura fiscal se emite por separado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {payments.map((p) => {
            const method = methods.find((m) => m.id === p.methodId);
            return (
              <div key={p.key} className="rounded-xl bg-surface p-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Medio de pago</Label>
                    <Select value={p.methodId} onValueChange={(value) => update(p.key, { methodId: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {methods.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32">
                    <Label className="text-xs text-muted-foreground">Importe</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="mt-1"
                      value={p.amount}
                      onChange={(e) => update(p.key, { amount: Number(e.target.value) || 0 })}
                    />
                  </div>
                  {payments.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Quitar pago"
                      onClick={() => setPayments((prev) => prev.filter((x) => x.key !== p.key))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {method?.requires_reference && (
                  <div className="mt-2">
                    <Label className="text-xs text-muted-foreground">Referencia / autorización</Label>
                    <Input
                      className="mt-1"
                      value={p.reference}
                      onChange={(e) => update(p.key, { reference: e.target.value })}
                      placeholder="Número de operación"
                    />
                  </div>
                )}
              </div>
            );
          })}

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              setPayments((prev) => [
                ...prev,
                {
                  key: crypto.randomUUID(),
                  methodId: methods[0]?.id ?? "",
                  amount: Math.max(pending, 0),
                  reference: "",
                },
              ])
            }
          >
            <Plus className="h-3.5 w-3.5" /> Agregar medio de pago
          </Button>

          <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Cliente (opcional)</Label>
              <Input
                className="mt-1"
                value={customer.name}
                onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                placeholder="Nombre y apellido"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Identificación fiscal</Label>
              <Input
                className="mt-1"
                value={customer.taxId}
                onChange={(e) => setCustomer((c) => ({ ...c, taxId: e.target.value }))}
                placeholder="CUIT / CPF"
              />
            </div>
          </div>

          <p className={pending === 0 ? "text-sm text-success" : "text-sm text-warning"}>
            {pending > 0
              ? `Falta cubrir ${formatMoney(pending, currency, locale)}`
              : pending < 0
                ? `Excede el total en ${formatMoney(Math.abs(pending), currency, locale)}`
                : "Pago completo"}
          </p>
          {missingReference && (
            <p className="text-sm text-destructive">Completá la referencia de los pagos que la requieren.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!canConfirm} onClick={() => onConfirm(payments, customer)}>
            {submitting ? "Registrando…" : "Confirmar venta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}