import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Camera, Loader2, Paperclip, Plus, Wallet, X } from "lucide-react";
import { toast } from "sonner";

import { StatCard } from "@/components/ftg/StatCard";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useScope } from "@/hooks/useScope";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/ftg/format";
import {
  AGING_ORDER,
  FINANCE_STATUS_LABEL,
  FINANCE_STATUS_TONE,
  agingBucket,
  balanceOf,
  daysUntil,
  type FinanceDocKind,
  type FinanceDocStatus,
} from "@/lib/ftg/finance";

export function FinanceDocsPanel({ kind }: { kind: FinanceDocKind }) {
  const { activeLocation, activeLocationId } = useScope();
  const queryClient = useQueryClient();
  const tab = kind;
  const [open, setOpen] = useState(false);
  const [payDoc, setPayDoc] = useState<{ id: string; balance: number; currency: string; amount: number; paid: number } | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [draft, setDraft] = useState({
    concept: "",
    counterparty: "",
    document_number: "",
    amount: "",
    due_on: "",
    cost_center: "",
  });

  const { data } = useQuery({
    queryKey: ["administracion", activeLocationId],
    queryFn: async () => {
      const [docs, customers, suppliers, sessions] = await Promise.all([
        supabase
          .from("finance_documents")
          .select(
            "id, kind, status, concept, document_number, amount, paid_amount, currency_code, issued_on, due_on, cost_center, customer_id, supplier_id, location_id, organization_id, customers(name), suppliers(name)",
          )
          .order("due_on", { ascending: true }),
        supabase.from("customers").select("id, name, organization_id").order("name"),
        supabase.from("suppliers").select("id, name, organization_id").order("name"),
        supabase
          .from("cash_sessions")
          .select("id, status, currency_code, opening_amount, expected_amount, counted_amount, difference_amount, opened_at, closed_at, point_of_sale_id, points_of_sale(name)")
          .order("opened_at", { ascending: false })
          .limit(8),
      ]);
      if (docs.error) throw docs.error;
      return {
        docs: docs.data ?? [],
        customers: customers.data ?? [],
        suppliers: suppliers.data ?? [],
        sessions: (sessions.data ?? []).filter((s) => !activeLocationId || true),
      };
    },
  });

  const docs = data?.docs ?? [];
  const currency = activeLocation?.currency_code ?? "ARS";
  const rows = docs.filter((d) => d.kind === tab);

  const totals = useMemo(() => {
    const sum = (kind: FinanceDocKind) =>
      docs
        .filter((d) => d.kind === kind && d.status !== "anulado" && d.status !== "pagado")
        .reduce((acc, d) => acc + balanceOf({ amount: Number(d.amount), paid_amount: Number(d.paid_amount) }), 0);
    const overdue = docs
      .filter((d) => d.status !== "pagado" && d.status !== "anulado" && (daysUntil(d.due_on) ?? 1) < 0)
      .reduce((acc, d) => acc + balanceOf({ amount: Number(d.amount), paid_amount: Number(d.paid_amount) }), 0);
    const receivable = sum("cobrar");
    const payable = sum("pagar");
    return { receivable, payable, overdue, flow: receivable - payable };
  }, [docs]);

  const aging = useMemo(() => {
    const buckets = new Map<string, number>();
    rows
      .filter((d) => d.status !== "pagado" && d.status !== "anulado")
      .forEach((d) => {
        const key = agingBucket(d.due_on);
        const value = balanceOf({ amount: Number(d.amount), paid_amount: Number(d.paid_amount) });
        buckets.set(key, (buckets.get(key) ?? 0) + value);
      });
    return AGING_ORDER.filter((k) => buckets.has(k)).map((k) => ({ key: k, value: buckets.get(k)! }));
  }, [rows]);

  const createDoc = useMutation({
    mutationFn: async () => {
      const list = tab === "cobrar" ? data?.customers ?? [] : data?.suppliers ?? [];
      const party = list.find((p) => p.id === draft.counterparty);
      const organizationId = party?.organization_id ?? docs[0]?.organization_id;
      if (!organizationId) throw new Error("No se encontró la organización");
      const amount = Number(draft.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Importe inválido");
      const { error } = await supabase.from("finance_documents").insert({
        organization_id: organizationId,
        location_id: activeLocationId,
        kind: tab,
        status: "pendiente",
        customer_id: tab === "cobrar" ? draft.counterparty || null : null,
        supplier_id: tab === "pagar" ? draft.counterparty || null : null,
        concept: draft.concept,
        document_number: draft.document_number || null,
        cost_center: draft.cost_center || null,
        currency_code: currency,
        amount,
        due_on: draft.due_on || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tab === "cobrar" ? "Documento por cobrar creado" : "Documento por pagar creado");
      setOpen(false);
      setDraft({ concept: "", counterparty: "", document_number: "", amount: "", due_on: "", cost_center: "" });
      queryClient.invalidateQueries({ queryKey: ["administracion"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const registerPayment = useMutation({
    mutationFn: async () => {
      if (!payDoc) return;
      const value = Number(payAmount);
      if (!Number.isFinite(value) || value <= 0) throw new Error("Importe inválido");
      if (!receipt) throw new Error("Adjuntá el comprobante: subí un archivo o sacá una foto");

      const ext = (receipt.name.split(".").pop() ?? "jpg").toLowerCase();
      const path = `${payDoc.id}/${Date.now()}.${ext}`;
      const upload = await supabase.storage.from("finance-receipts").upload(path, receipt, {
        contentType: receipt.type || "application/octet-stream",
        upsert: false,
      });
      if (upload.error) throw new Error(`No pudimos subir el comprobante: ${upload.error.message}`);

      const paid = Math.min(payDoc.amount, payDoc.paid + value);
      const status: FinanceDocStatus = paid >= payDoc.amount ? "pagado" : "parcial";
      const { error } = await supabase
        .from("finance_documents")
        .update({ paid_amount: paid, status, receipt_path: path })
        .eq("id", payDoc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Movimiento de tesorería registrado");
      setPayDoc(null);
      setPayAmount("");
      clearReceipt();
      queryClient.invalidateQueries({ queryKey: ["administracion"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function clearReceipt() {
    setReceipt(null);
    setReceiptPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function pickReceipt(file: File | null) {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error("El comprobante no puede superar 15 MB");
      return;
    }
    clearReceipt();
    setReceipt(file);
    if (file.type.startsWith("image/")) setReceiptPreview(URL.createObjectURL(file));
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Nuevo documento
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Por cobrar" value={formatMoney(totals.receivable, currency)} icon={ArrowDownLeft} tone="success" />
        <StatCard label="Por pagar" value={formatMoney(totals.payable, currency)} icon={ArrowUpRight} tone="warning" />
        <StatCard
          label="Vencido"
          value={formatMoney(totals.overdue, currency)}
          tone={totals.overdue > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Flujo estimado"
          value={formatMoney(totals.flow, currency)}
          icon={Wallet}
          hint="Por cobrar menos por pagar"
        />
      </div>

      {aging.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {aging.map((a) => (
            <div key={a.key} className="surface-card p-4">
              <p className="text-xs text-muted-foreground uppercase">{a.key}</p>
              <p className="mt-1 text-lg font-semibold">{formatMoney(a.value, currency)}</p>
            </div>
          ))}
        </div>
      )}

      <section className="surface-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Concepto</TableHead>
              <TableHead>{tab === "cobrar" ? "Cliente" : "Proveedor"}</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Centro de costo</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  No hay documentos cargados.
                </TableCell>
              </TableRow>
            )}
            {rows.map((d) => {
              const balance = balanceOf({ amount: Number(d.amount), paid_amount: Number(d.paid_amount) });
              const days = daysUntil(d.due_on);
              return (
                <TableRow key={d.id}>
                  <TableCell>
                    <p className="font-medium">{d.concept}</p>
                    <p className="font-mono text-xs text-muted-foreground">{d.document_number ?? "—"}</p>
                  </TableCell>
                  <TableCell className="text-sm">{d.customers?.name ?? d.suppliers?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    {d.due_on ?? "—"}
                    {days !== null && d.status !== "pagado" && (
                      <span className={cn("block text-xs", days < 0 ? "text-destructive" : "text-muted-foreground")}>
                        {days < 0 ? `vencido hace ${Math.abs(days)} d` : `en ${days} d`}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.cost_center ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatMoney(Number(d.amount), d.currency_code)}</TableCell>
                  <TableCell className="text-right font-medium">{formatMoney(balance, d.currency_code)}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[11px] font-medium",
                        FINANCE_STATUS_TONE[d.status as FinanceDocStatus],
                      )}
                    >
                      {FINANCE_STATUS_LABEL[d.status as FinanceDocStatus]}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={balance <= 0}
                      onClick={() => {
                        setPayDoc({
                          id: d.id,
                          balance,
                          currency: d.currency_code,
                          amount: Number(d.amount),
                          paid: Number(d.paid_amount),
                        });
                        setPayAmount(String(balance));
                      }}
                    >
                      {tab === "cobrar" ? "Registrar cobro" : "Registrar pago"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tab === "cobrar" ? "Nuevo documento por cobrar" : "Nuevo documento por pagar"}</DialogTitle>
            <DialogDescription>Se registra en la sede activa y en {currency}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{tab === "cobrar" ? "Cliente" : "Proveedor"}</Label>
              <Select value={draft.counterparty} onValueChange={(v) => setDraft((p) => ({ ...p, counterparty: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Elegí una contraparte" />
                </SelectTrigger>
                <SelectContent>
                  {(tab === "cobrar" ? data?.customers ?? [] : data?.suppliers ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="concept">Concepto</Label>
              <Input
                id="concept"
                value={draft.concept}
                onChange={(e) => setDraft((p) => ({ ...p, concept: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="docnum">Número de documento</Label>
                <Input
                  id="docnum"
                  value={draft.document_number}
                  onChange={(e) => setDraft((p) => ({ ...p, document_number: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount">Importe</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  value={draft.amount}
                  onChange={(e) => setDraft((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="due">Vencimiento</Label>
                <Input
                  id="due"
                  type="date"
                  value={draft.due_on}
                  onChange={(e) => setDraft((p) => ({ ...p, due_on: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cc">Centro de costo</Label>
                <Input
                  id="cc"
                  value={draft.cost_center}
                  onChange={(e) => setDraft((p) => ({ ...p, cost_center: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={!draft.concept || !draft.amount || createDoc.isPending} onClick={() => createDoc.mutate()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!payDoc}
        onOpenChange={(v) => {
          if (!v) {
            setPayDoc(null);
            clearReceipt();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tab === "cobrar" ? "Registrar cobro" : "Registrar pago"}</DialogTitle>
            <DialogDescription>
              Saldo pendiente: {payDoc ? formatMoney(payDoc.balance, payDoc.currency) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pay">Importe</Label>
              <Input id="pay" type="number" min="0" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Comprobante (obligatorio)</Label>
              <p className="text-xs text-muted-foreground">
                Subí un archivo o sacá una foto del comprobante. Formato libre: imagen o PDF.
              </p>

              {receipt ? (
                <div className="flex items-center gap-3 rounded-lg border border-border p-2">
                  {receiptPreview ? (
                    <img src={receiptPreview} alt="Comprobante adjunto" className="h-14 w-14 rounded object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded bg-muted">
                      <Paperclip className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{receipt.name}</p>
                    <p className="text-xs text-muted-foreground">{(receipt.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={clearReceipt} aria-label="Quitar comprobante">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-border p-3 text-xs hover:border-primary/50">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    Subir archivo
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => pickReceipt(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-border p-3 text-xs hover:border-primary/50">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    Sacar foto
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => pickReceipt(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setPayDoc(null);
                clearReceipt();
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={registerPayment.isPending || !receipt || !payAmount}
              onClick={() => registerPayment.mutate()}
            >
              {registerPayment.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
