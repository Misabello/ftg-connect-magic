import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Copy, Inbox, Loader2, Mail, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { InvoiceReviewDialog } from "@/components/ftg/invoices/InvoiceReviewDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, relativeTime } from "@/lib/ftg/format";
import {
  APPROVAL_LABEL,
  COUNTRY_RULES,
  DOC_TYPE_LABEL,
  EXTRACTION_LABEL,
  LOW_CONFIDENCE,
  type InvoiceDocument,
} from "@/lib/ftg/invoices";

const TABS = [
  { key: "revision", label: "Bandeja de revisión" },
  { key: "todos", label: "Todos los documentos" },
  { key: "casillas", label: "Casillas de correo" },
  { key: "alertas", label: "Alertas" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/** Sección "Automatización de facturas" del módulo de Administración. */
export function InvoiceAutomation() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("revision");
  const [direction, setDirection] = useState<string>("todas");
  const [selected, setSelected] = useState<InvoiceDocument | null>(null);
  const [newAccount, setNewAccount] = useState({ email_address: "", country_code: "AR", inbox_label: "FTG/Facturas" });

  const { data, isLoading } = useQuery({
    queryKey: ["invoice-automation"],
    queryFn: async () => {
      const since = new Date(Date.now() - 86400000).toISOString();
      const [docs, accounts, events, alerts] = await Promise.all([
        supabase.from("invoice_documents").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("email_ingestion_accounts").select("*").order("email_address"),
        supabase.from("email_ingestion_events").select("id, status, received_at, subject, sender, created_at").gte("created_at", since),
        supabase
          .from("invoice_alerts")
          .select("id, alert_type, severity, message, resolved, created_at")
          .eq("resolved", false)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      return {
        docs: (docs.data ?? []) as unknown as InvoiceDocument[],
        accounts: accounts.data ?? [],
        events: events.data ?? [],
        alerts: alerts.data ?? [],
      };
    },
  });

  const docs = data?.docs ?? [];

  const metrics = useMemo(() => {
    const pending = docs.filter((d) => ["requiere_revision", "pendiente_aprobacion"].includes(d.approval_status));
    const duplicates = docs.filter((d) => d.approval_status === "posible_duplicado");
    const errors = docs.filter((d) => d.extraction_status === "error");
    const low = docs.filter((d) => d.confidence_score > 0 && d.confidence_score < LOW_CONFIDENCE);
    const extracted = docs.filter((d) => d.extraction_status === "extraido");
    const totals = new Map<string, number>();
    docs.forEach((d) => {
      const cur = d.currency_code ?? "—";
      totals.set(cur, (totals.get(cur) ?? 0) + Number(d.total_amount ?? 0));
    });
    return {
      emails: data?.events.length ?? 0,
      detected: docs.length,
      pending: pending.length,
      duplicates: duplicates.length,
      errors: errors.length,
      low: low.length,
      suppliers: docs.filter((d) => d.document_direction === "proveedor").length,
      customers: docs.filter((d) => d.document_direction === "cliente").length,
      autoRate: docs.length ? Math.round((extracted.length / docs.length) * 100) : 0,
      totals: [...totals.entries()],
    };
  }, [docs, data?.events]);

  const rows = useMemo(() => {
    let list = docs;
    if (tab === "revision") {
      list = list.filter((d) => !["aprobada", "rechazada", "pagada"].includes(d.approval_status));
    }
    if (direction !== "todas") list = list.filter((d) => d.document_direction === direction);
    return list;
  }, [docs, tab, direction]);

  const createAccount = useMutation({
    mutationFn: async () => {
      if (!profile?.organization_id) throw new Error("Falta la organización del perfil");
      const { error } = await supabase.from("email_ingestion_accounts").insert({
        organization_id: profile.organization_id,
        email_address: newAccount.email_address.trim().toLowerCase(),
        country_code: newAccount.country_code,
        inbox_label: newAccount.inbox_label,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Casilla registrada");
      setNewAccount({ email_address: "", country_code: "AR", inbox_label: "FTG/Facturas" });
      await queryClient.invalidateQueries({ queryKey: ["invoice-automation"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const endpoint = `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/invoices/ingest`;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Automatización de facturas</h2>
          <p className="text-sm text-muted-foreground">
            Los correos con comprobantes llegan firmados desde Gmail, se leen con IA y esperan tu aprobación.
          </p>
        </div>
        <Select value={direction} onValueChange={setDirection}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos los sentidos</SelectItem>
            <SelectItem value="proveedor">De proveedores</SelectItem>
            <SelectItem value="cliente">A clientes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Correos revisados hoy" value={metrics.emails} />
        <Metric label="Documentos detectados" value={metrics.detected} />
        <Metric label="Pendientes de revisión" value={metrics.pending} tone={metrics.pending ? "warn" : undefined} />
        <Metric label="Posibles duplicados" value={metrics.duplicates} tone={metrics.duplicates ? "warn" : undefined} />
        <Metric label="Errores de proceso" value={metrics.errors} tone={metrics.errors ? "bad" : undefined} />
        <Metric label="Baja confianza" value={metrics.low} tone={metrics.low ? "warn" : undefined} />
        <Metric label="Proveedores / clientes" value={`${metrics.suppliers} / ${metrics.customers}`} />
        <Metric label="Extracción automática" value={`${metrics.autoRate}%`} />
      </div>

      {metrics.totals.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {metrics.totals.map(([cur, total]) => (
            <Badge key={cur} variant="secondary">Total {cur}: {formatMoney(total, cur === "—" ? "ARS" : cur)}</Badge>
          ))}
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {(tab === "revision" || tab === "todos") && (
        <div className="surface-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Emisor</TableHead>
                <TableHead>Emisión</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Confianza</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></TableCell></TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    <Inbox className="mx-auto mb-2 h-5 w-5" />
                    Todavía no llegaron comprobantes por correo.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <p className="font-medium">{DOC_TYPE_LABEL[d.document_type] ?? d.document_type}</p>
                    <p className="font-mono text-xs text-muted-foreground">{d.document_number ?? d.file_name ?? "—"}</p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {d.issuer_name ?? "—"}
                    <span className="block text-xs text-muted-foreground">{d.issuer_tax_id ?? ""}</span>
                  </TableCell>
                  <TableCell className="text-sm">{d.issue_date ?? relativeTime(d.created_at)}</TableCell>
                  <TableCell className="text-right font-medium">{formatMoney(Number(d.total_amount), d.currency_code ?? "ARS")}</TableCell>
                  <TableCell>
                    <span className={d.confidence_score < LOW_CONFIDENCE ? "text-destructive" : ""}>
                      {Math.round(d.confidence_score)}%
                    </span>
                    <span className="block text-xs text-muted-foreground">{EXTRACTION_LABEL[d.extraction_status] ?? d.extraction_status}</span>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{APPROVAL_LABEL[d.approval_status] ?? d.approval_status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="secondary" onClick={() => setSelected(d)}>Revisar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {tab === "casillas" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="surface-card space-y-3 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold"><Mail className="h-4 w-4" /> Casillas inspeccionadas</p>
            {(data?.accounts ?? []).length === 0 && <p className="text-sm text-muted-foreground">Todavía no registraste casillas.</p>}
            <ul className="space-y-2">
              {(data?.accounts ?? []).map((a) => (
                <li key={a.id} className="rounded-xl bg-surface p-3 text-sm">
                  <p className="font-medium">{a.email_address}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.country_code ?? "sin país"} · etiqueta {a.inbox_label} · cada {a.frequency_minutes} min ·{" "}
                    {a.last_checked_at ? `última revisión ${relativeTime(a.last_checked_at)}` : "sin revisiones"}
                  </p>
                </li>
              ))}
            </ul>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Label className="text-xs">Correo</Label>
                <Input
                  type="email"
                  placeholder="facturas@empresa.com"
                  value={newAccount.email_address}
                  onChange={(e) => setNewAccount({ ...newAccount, email_address: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">País</Label>
                <Select value={newAccount.country_code} onValueChange={(v) => setNewAccount({ ...newAccount, country_code: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(COUNTRY_RULES).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => createAccount.mutate()} disabled={!newAccount.email_address || createAccount.isPending}>
              <Plus className="mr-2 h-4 w-4" /> Registrar casilla
            </Button>
          </div>

          <div className="surface-card space-y-3 p-5 text-sm">
            <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> Conexión con Google Apps Script</p>
            <p className="text-muted-foreground">
              El script sólo recolecta correos y firma cada envío con HMAC. No guarda claves de la base ni de IA.
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Copiá <code>docs/apps-script/ftg-invoice-collector.gs</code> en tu proyecto de Apps Script.</li>
              <li>Cargá las propiedades del script: <code>ENDPOINT_URL</code>, <code>INGEST_SECRET</code>, <code>ACCOUNT_EMAIL</code> y <code>COUNTRY_CODE</code>.</li>
              <li>Ejecutá <code>setUpTriggers()</code> para revisar la casilla cada 10 minutos.</li>
              <li>Las etiquetas Procesando / Procesado / Requiere revisión / Error se crean solas.</li>
            </ol>
            <div className="flex items-center gap-2 rounded-lg bg-surface p-3">
              <code className="flex-1 truncate text-xs">{endpoint}</code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  void navigator.clipboard.writeText(endpoint);
                  toast.success("Endpoint copiado");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Las solicitudes sin firma válida, repetidas o con más de 5 minutos de antigüedad se rechazan.
            </p>
          </div>
        </div>
      )}

      {tab === "alertas" && (
        <div className="surface-card p-5">
          {(data?.alerts ?? []).length === 0 && <p className="text-sm text-muted-foreground">Sin alertas abiertas.</p>}
          <ul className="space-y-2">
            {(data?.alerts ?? []).map((a) => (
              <li key={a.id} className="flex items-start gap-3 rounded-xl bg-surface p-3 text-sm">
                <AlertTriangle className={`mt-0.5 h-4 w-4 ${a.severity === "critica" ? "text-destructive" : "text-muted-foreground"}`} />
                <div>
                  <p className="font-medium">{a.alert_type}</p>
                  <p className="text-xs text-muted-foreground">{a.message} · {relativeTime(a.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <InvoiceReviewDialog document={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone?: "warn" | "bad" }) {
  return (
    <div className="surface-card p-4">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${tone === "bad" ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}