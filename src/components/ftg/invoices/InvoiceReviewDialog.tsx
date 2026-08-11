import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Copy, Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { approveInvoiceDocument, extractInvoiceDocument } from "@/lib/ftg/invoices.functions";
import { DOC_TYPE_LABEL, LOW_CONFIDENCE, validateInvoice, type InvoiceDocument } from "@/lib/ftg/invoices";
import { formatMoney } from "@/lib/ftg/format";

type Props = {
  document: InvoiceDocument | null;
  onClose: () => void;
};

type Editable = Pick<
  InvoiceDocument,
  | "document_direction"
  | "document_type"
  | "country_code"
  | "issuer_name"
  | "issuer_tax_id"
  | "document_number"
  | "series"
  | "issue_date"
  | "due_date"
  | "currency_code"
  | "cost_center"
> & { net_amount: string; tax_amount: string; total_amount: string };

/** Bandeja de revisión: documento a la izquierda, datos extraídos a la derecha. */
export function InvoiceReviewDialog({ document, onClose }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Editable | null>(null);
  const [supplierId, setSupplierId] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");

  useEffect(() => {
    if (!document) return setForm(null);
    setForm({
      document_direction: document.document_direction,
      document_type: document.document_type,
      country_code: document.country_code,
      issuer_name: document.issuer_name,
      issuer_tax_id: document.issuer_tax_id,
      document_number: document.document_number,
      series: document.series,
      issue_date: document.issue_date,
      due_date: document.due_date,
      currency_code: document.currency_code,
      cost_center: document.cost_center,
      net_amount: String(document.net_amount ?? 0),
      tax_amount: String(document.tax_amount ?? 0),
      total_amount: String(document.total_amount ?? 0),
    });
    setSupplierId(document.supplier_id ?? "");
    setCustomerId(document.customer_id ?? "");
  }, [document]);

  const { data: preview } = useQuery({
    queryKey: ["invoice-preview", document?.id],
    enabled: !!document?.storage_path,
    queryFn: async () => {
      const { data } = await supabase.storage
        .from(document!.storage_bucket)
        .createSignedUrl(document!.storage_path!, 600);
      return data?.signedUrl ?? null;
    },
  });

  const { data: fields = [] } = useQuery({
    queryKey: ["invoice-fields", document?.id],
    enabled: !!document,
    queryFn: async () => {
      const { data } = await supabase
        .from("invoice_extracted_fields")
        .select("field_name, extracted_value, corrected_value, confidence, extraction_source")
        .eq("invoice_document_id", document!.id)
        .order("field_name");
      return data ?? [];
    },
  });

  const { data: parties } = useQuery({
    queryKey: ["invoice-parties", document?.organization_id],
    enabled: !!document,
    queryFn: async () => {
      const [suppliers, customers] = await Promise.all([
        supabase.from("suppliers").select("id, name").eq("is_active", true).order("name"),
        supabase.from("customers").select("id, name").eq("is_active", true).order("name"),
      ]);
      return { suppliers: suppliers.data ?? [], customers: customers.data ?? [] };
    },
  });

  const notes = useMemo(() => {
    if (!form || !document) return [];
    return validateInvoice({
      net_amount: Number(form.net_amount || 0),
      tax_amount: Number(form.tax_amount || 0),
      withholding_amount: document.withholding_amount,
      perception_amount: document.perception_amount,
      total_amount: Number(form.total_amount || 0),
      currency_code: form.currency_code,
      issue_date: form.issue_date,
      due_date: form.due_date,
      issuer_tax_id: form.issuer_tax_id,
      document_number: form.document_number,
      country_code: form.country_code,
      confidence_score: document.confidence_score,
    });
  }, [form, document]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["invoice-automation"] });
  };

  const reprocess = useMutation({
    mutationFn: async () => extractInvoiceDocument({ data: { documentId: document!.id } }),
    onSuccess: async () => {
      toast.success("Documento reprocesado");
      await refresh();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("invoice_documents")
        .update({
          document_direction: form!.document_direction,
          document_type: form!.document_type as "no_reconocido",
          country_code: form!.country_code,
          issuer_name: form!.issuer_name,
          issuer_tax_id: form!.issuer_tax_id,
          document_number: form!.document_number,
          series: form!.series,
          issue_date: form!.issue_date || null,
          due_date: form!.due_date || null,
          currency_code: form!.currency_code,
          cost_center: form!.cost_center,
          net_amount: Number(form!.net_amount || 0),
          tax_amount: Number(form!.tax_amount || 0),
          total_amount: Number(form!.total_amount || 0),
          supplier_id: supplierId || null,
          customer_id: customerId || null,
        })
        .eq("id", document!.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Correcciones guardadas");
      await refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from("invoice_documents")
        .update({ approval_status: status })
        .eq("id", document!.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refresh();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approve = useMutation({
    mutationFn: async () => {
      await save.mutateAsync();
      return approveInvoiceDocument({
        data: {
          documentId: document!.id,
          supplierId: supplierId || null,
          customerId: customerId || null,
          costCenter: form!.cost_center,
        },
      });
    },
    onSuccess: async () => {
      toast.success("Documento aprobado: se creó la cuenta correspondiente");
      await refresh();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const critical = notes.some((n) => n.level === "critical");

  return (
    <Dialog open={!!document} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Revisión de comprobante
            {document && (
              <>
                <Badge variant="secondary">{DOC_TYPE_LABEL[document.document_type] ?? document.document_type}</Badge>
                <Badge variant={document.confidence_score < LOW_CONFIDENCE ? "destructive" : "secondary"}>
                  Confianza {Math.round(document.confidence_score)}%
                </Badge>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {document && form && (
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="surface-card overflow-hidden rounded-xl">
                {preview ? (
                  document.mime_type?.startsWith("image/") ? (
                    <img src={preview} alt={`Comprobante ${document.document_number ?? ""}`} className="max-h-[60vh] w-full object-contain" />
                  ) : (
                    <iframe src={preview} title="Comprobante" className="h-[60vh] w-full" />
                  )
                ) : (
                  <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando documento…
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{document.file_name} · {document.mime_type}</p>

              {fields.length > 0 && (
                <div className="surface-card p-4">
                  <p className="text-sm font-semibold">Campos detectados</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    {fields.map((f) => (
                      <li key={f.field_name} className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">{f.field_name}</span>
                        <span className="truncate font-medium">{f.corrected_value ?? f.extracted_value ?? "—"}</span>
                        <span className={Number(f.confidence) < LOW_CONFIDENCE ? "text-destructive" : "text-muted-foreground"}>
                          {Math.round(Number(f.confidence))}% · {f.extraction_source}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {notes.length > 0 && (
                <ul className="space-y-2">
                  {notes.map((n, i) => (
                    <li
                      key={i}
                      className={`flex items-start gap-2 rounded-lg p-3 text-xs ${
                        n.level === "critical" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {n.message}
                    </li>
                  ))}
                </ul>
              )}
              {document.bank_details && (
                <div className="rounded-lg bg-warning/10 p-3 text-xs">
                  Datos bancarios leídos del documento (nunca se actualizan automáticamente):{" "}
                  <span className="font-mono">{document.bank_details}</span>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tipo de operación">
                  <Select
                    value={form.document_direction}
                    onValueChange={(v) => setForm({ ...form, document_direction: v as "proveedor" | "cliente" })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proveedor">Factura de proveedor</SelectItem>
                      <SelectItem value="cliente">Factura a cliente</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Tipo de documento">
                  <Select value={form.document_type} onValueChange={(v) => setForm({ ...form, document_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(DOC_TYPE_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Emisor"><Input value={form.issuer_name ?? ""} onChange={(e) => setForm({ ...form, issuer_name: e.target.value })} /></Field>
                <Field label="Identificación fiscal"><Input value={form.issuer_tax_id ?? ""} onChange={(e) => setForm({ ...form, issuer_tax_id: e.target.value })} /></Field>
                <Field label="Número"><Input value={form.document_number ?? ""} onChange={(e) => setForm({ ...form, document_number: e.target.value })} /></Field>
                <Field label="Serie / punto de venta"><Input value={form.series ?? ""} onChange={(e) => setForm({ ...form, series: e.target.value })} /></Field>
                <Field label="Emisión"><Input type="date" value={form.issue_date ?? ""} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></Field>
                <Field label="Vencimiento"><Input type="date" value={form.due_date ?? ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
                <Field label="Moneda"><Input value={form.currency_code ?? ""} onChange={(e) => setForm({ ...form, currency_code: e.target.value.toUpperCase() })} /></Field>
                <Field label="País"><Input value={form.country_code ?? ""} onChange={(e) => setForm({ ...form, country_code: e.target.value.toUpperCase() })} /></Field>
                <Field label="Neto"><Input inputMode="decimal" value={form.net_amount} onChange={(e) => setForm({ ...form, net_amount: e.target.value })} /></Field>
                <Field label="Impuestos"><Input inputMode="decimal" value={form.tax_amount} onChange={(e) => setForm({ ...form, tax_amount: e.target.value })} /></Field>
                <Field label="Total"><Input inputMode="decimal" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} /></Field>
                <Field label="Centro de costo"><Input value={form.cost_center ?? ""} onChange={(e) => setForm({ ...form, cost_center: e.target.value })} /></Field>
                {form.document_direction === "proveedor" ? (
                  <Field label="Proveedor">
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger><SelectValue placeholder="Vincular proveedor" /></SelectTrigger>
                      <SelectContent>
                        {(parties?.suppliers ?? []).map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                ) : (
                  <Field label="Cliente">
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger><SelectValue placeholder="Vincular cliente" /></SelectTrigger>
                      <SelectContent>
                        {(parties?.customers ?? []).map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </div>

              <div className="rounded-xl bg-surface p-4 text-sm">
                Se creará una cuenta por {form.document_direction === "cliente" ? "cobrar" : "pagar"} por{" "}
                <strong>{formatMoney(Number(form.total_amount || 0), form.currency_code ?? "ARS")}</strong>.
                La IA solamente propone: el movimiento se crea recién al aprobar.
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => approve.mutate()} disabled={approve.isPending || critical || document.approval_status === "aprobada"}>
                  {approve.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Aprobar
                </Button>
                <Button variant="secondary" onClick={() => save.mutate()} disabled={save.isPending}>Guardar correcciones</Button>
                <Button variant="secondary" onClick={() => reprocess.mutate()} disabled={reprocess.isPending}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Reprocesar
                </Button>
                <Button variant="ghost" onClick={() => setStatus.mutate("posible_duplicado")}>
                  <Copy className="mr-2 h-4 w-4" /> Marcar duplicado
                </Button>
                <Button variant="ghost" className="text-destructive" onClick={() => setStatus.mutate("rechazada")}>
                  <X className="mr-2 h-4 w-4" /> Rechazar
                </Button>
              </div>
              {critical && <p className="text-xs text-destructive">Resolvé las alertas críticas antes de aprobar.</p>}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}