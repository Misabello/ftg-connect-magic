import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Plus, User } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/ftg/PageHeader";
import { StatCard } from "@/components/ftg/StatCard";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useScope } from "@/hooks/useScope";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/ftg/format";
import { CUSTOMER_KIND_LABEL, balanceOf, type CustomerKind } from "@/lib/ftg/finance";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — FTG ONE" },
      { name: "description", content: "Clientes corporativos y consumidores finales con datos fiscales y saldos." },
      { property: "og:title", content: "Clientes — FTG ONE" },
      {
        property: "og:description",
        content: "Clientes corporativos y consumidores finales con datos fiscales y saldos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Clientes,
});

type Draft = {
  kind: CustomerKind;
  name: string;
  legal_name: string;
  tax_id: string;
  tax_condition: string;
  email: string;
  phone: string;
};

const EMPTY: Draft = {
  kind: "corporativo",
  name: "",
  legal_name: "",
  tax_id: "",
  tax_condition: "",
  email: "",
  phone: "",
};

function Clientes() {
  const { activeLocation, activeLocationId } = useScope();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"todos" | CustomerKind>("todos");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const { data } = useQuery({
    queryKey: ["clientes", activeLocationId],
    queryFn: async () => {
      const [customers, docs, sales] = await Promise.all([
        supabase
          .from("customers")
          .select(
            "id, kind, name, legal_name, tax_id, tax_condition, email, phone, country_code, location_id, organization_id, created_at",
          )
          .order("name"),
        supabase.from("finance_documents").select("id, customer_id, kind, amount, paid_amount, currency_code, status"),
        supabase.from("sales").select("id, customer_id, total, currency_code, status"),
      ]);
      if (customers.error) throw customers.error;
      return { customers: customers.data ?? [], docs: docs.data ?? [], sales: sales.data ?? [] };
    },
  });

  const customers = data?.customers ?? [];
  const currency = activeLocation?.currency_code ?? "ARS";

  const enriched = useMemo(
    () =>
      customers.map((c) => {
        const docs = (data?.docs ?? []).filter((d) => d.customer_id === c.id && d.kind === "cobrar");
        const sales = (data?.sales ?? []).filter((s) => s.customer_id === c.id && s.status === "completada");
        return {
          ...c,
          balance: docs.reduce((acc, d) => acc + balanceOf({ amount: Number(d.amount), paid_amount: Number(d.paid_amount) }), 0),
          docCurrency: docs[0]?.currency_code ?? currency,
          purchases: sales.length,
        };
      }),
    [customers, data?.docs, data?.sales, currency],
  );

  const visible = enriched.filter(
    (c) =>
      (filter === "todos" || c.kind === filter) &&
      (search.trim() === "" ||
        `${c.name} ${c.legal_name ?? ""} ${c.tax_id ?? ""}`.toLowerCase().includes(search.toLowerCase())),
  );

  const corporate = enriched.filter((c) => c.kind === "corporativo").length;
  const totalBalance = enriched.reduce((acc, c) => acc + c.balance, 0);

  const createCustomer = useMutation({
    mutationFn: async () => {
      const organizationId = customers[0]?.organization_id;
      if (!organizationId) throw new Error("No se encontró la organización");
      const { error } = await supabase.from("customers").insert({
        organization_id: organizationId,
        location_id: activeLocationId,
        kind: draft.kind,
        name: draft.name,
        legal_name: draft.legal_name || null,
        tax_id: draft.tax_id || null,
        tax_condition: draft.tax_condition || null,
        country_code: activeLocation?.country_code ?? null,
        email: draft.email || null,
        phone: draft.phone || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente creado");
      setOpen(false);
      setDraft(EMPTY);
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Clientes corporativos (parques y predios) y consumidores finales con datos fiscales, saldos e historial."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Nuevo cliente
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Clientes registrados" value={String(enriched.length)} icon={User} />
        <StatCard label="Corporativos" value={String(corporate)} icon={Building2} hint="Parques, predios y eventos" />
        <StatCard
          label="Saldo por cobrar"
          value={formatMoney(totalBalance, currency)}
          tone={totalBalance > 0 ? "warning" : "success"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="corporativo">Corporativos</TabsTrigger>
            <TabsTrigger value="consumidor_final">Consumidores finales</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o identificación fiscal"
          className="max-w-xs"
        />
      </div>

      <section className="surface-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Identificación fiscal</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead className="text-right">Compras</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No hay clientes para este filtro.
                </TableCell>
              </TableRow>
            )}
            {visible.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.legal_name ?? "—"}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={c.kind === "corporativo" ? "default" : "secondary"}>
                    {CUSTOMER_KIND_LABEL[c.kind as CustomerKind]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <p className="font-mono text-xs">{c.tax_id ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{c.tax_condition ?? "Sin condición"}</p>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {c.email ?? "—"}
                  <br />
                  {c.phone ?? ""}
                </TableCell>
                <TableCell className="text-right">{c.purchases}</TableCell>
                <TableCell className="text-right font-medium">
                  {c.balance > 0 ? formatMoney(c.balance, c.docCurrency) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
            <DialogDescription>
              Se asocia a la sede activa y al país correspondiente para los datos fiscales.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={draft.kind} onValueChange={(v) => set("kind", v as CustomerKind)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corporativo">Corporativo</SelectItem>
                    <SelectItem value="consumidor_final">Consumidor final</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" value={draft.name} onChange={(e) => set("name", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="legal">Razón social</Label>
                <Input id="legal" value={draft.legal_name} onChange={(e) => set("legal_name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tax">Identificación fiscal</Label>
                <Input id="tax" value={draft.tax_id} onChange={(e) => set("tax_id", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="cond">Condición</Label>
                <Input id="cond" value={draft.tax_condition} onChange={(e) => set("tax_condition", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mail">Email</Label>
                <Input id="mail" type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={!draft.name || createCustomer.isPending} onClick={() => createCustomer.mutate()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}