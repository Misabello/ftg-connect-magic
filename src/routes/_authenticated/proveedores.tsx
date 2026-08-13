import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Landmark, Loader2, Pencil, Plus, Truck } from "lucide-react";
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
import { PARTY_KIND_LABEL, type SupplierPartyKind } from "@/lib/ftg/accounting";
import { balanceOf } from "@/lib/ftg/finance";
import { formatMoney } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/proveedores")({
  head: () => ({
    meta: [
      { title: "Proveedores — FTG ONE" },
      {
        name: "description",
        content: "Proveedores, organismos estatales y otros terceros con datos fiscales y saldos por pagar.",
      },
      { property: "og:title", content: "Proveedores — FTG ONE" },
      {
        property: "og:description",
        content: "Proveedores, organismos estatales y otros terceros con datos fiscales y saldos por pagar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Proveedores,
});

type Draft = {
  id: string | null;
  party_kind: SupplierPartyKind;
  name: string;
  legal_name: string;
  tax_id: string;
  email: string;
  phone: string;
  cost_center: string;
  is_active: boolean;
};

const EMPTY: Draft = {
  id: null,
  party_kind: "proveedor",
  name: "",
  legal_name: "",
  tax_id: "",
  email: "",
  phone: "",
  cost_center: "",
  is_active: true,
};

function Proveedores() {
  const { activeLocation } = useScope();
  const queryClient = useQueryClient();
  const currency = activeLocation?.currency_code ?? "ARS";
  const [filter, setFilter] = useState<"todos" | SupplierPartyKind>("todos");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const { data, isLoading, error } = useQuery({
    queryKey: ["proveedores"],
    queryFn: async () => {
      const [suppliers, docs] = await Promise.all([
        supabase
          .from("suppliers")
          .select("id, name, legal_name, tax_id, email, phone, cost_center, is_active, party_kind, organization_id, country_code")
          .order("name"),
        supabase.from("finance_documents").select("supplier_id, kind, amount, paid_amount, currency_code, status"),
      ]);
      if (suppliers.error) throw suppliers.error;
      return { suppliers: suppliers.data ?? [], docs: docs.data ?? [] };
    },
  });

  const suppliers = data?.suppliers ?? [];

  const enriched = useMemo(
    () =>
      suppliers.map((s) => {
        const docs = (data?.docs ?? []).filter(
          (d) => d.supplier_id === s.id && d.kind === "pagar" && d.status !== "anulado",
        );
        return {
          ...s,
          balance: docs.reduce(
            (acc, d) => acc + balanceOf({ amount: Number(d.amount), paid_amount: Number(d.paid_amount) }),
            0,
          ),
          docCurrency: docs[0]?.currency_code ?? currency,
          docs: docs.length,
        };
      }),
    [suppliers, data?.docs, currency],
  );

  const visible = enriched.filter(
    (s) =>
      (filter === "todos" || s.party_kind === filter) &&
      (search.trim() === "" ||
        `${s.name} ${s.legal_name ?? ""} ${s.tax_id ?? ""}`.toLowerCase().includes(search.toLowerCase())),
  );

  const stateBodies = enriched.filter((s) => s.party_kind === "organismo_estatal").length;
  const totalBalance = enriched.reduce((acc, s) => acc + s.balance, 0);

  const save = useMutation({
    mutationFn: async () => {
      if (!draft.name.trim()) throw new Error("El nombre es obligatorio");
      const organizationId = suppliers[0]?.organization_id;
      const payload = {
        party_kind: draft.party_kind,
        name: draft.name.trim(),
        legal_name: draft.legal_name.trim() || null,
        tax_id: draft.tax_id.trim() || null,
        email: draft.email.trim() || null,
        phone: draft.phone.trim() || null,
        cost_center: draft.cost_center.trim() || null,
        is_active: draft.is_active,
      };
      if (draft.id) {
        const { error } = await supabase.from("suppliers").update(payload).eq("id", draft.id);
        if (error) throw error;
      } else {
        if (!organizationId) throw new Error("No se encontró la organización");
        const { error } = await supabase.from("suppliers").insert({
          ...payload,
          organization_id: organizationId,
          country_code: activeLocation?.country_code ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(draft.id ? "Proveedor actualizado" : "Proveedor creado");
      setOpen(false);
      setDraft(EMPTY);
      queryClient.invalidateQueries({ queryKey: ["proveedores"] });
      queryClient.invalidateQueries({ queryKey: ["administracion"] });
    },
    onError: (e: Error) => toast.error("No pudimos guardar el proveedor", { description: e.message }),
  });

  const toggleActive = useMutation({
    mutationFn: async (s: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("suppliers").update({ is_active: !s.is_active }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Estado actualizado");
      queryClient.invalidateQueries({ queryKey: ["proveedores"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proveedores"
        description="Proveedores comerciales, organismos estatales y otros terceros con su saldo por pagar."
        actions={
          <Button
            onClick={() => {
              setDraft(EMPTY);
              setOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Nuevo proveedor
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Terceros registrados" value={String(enriched.length)} icon={Truck} />
        <StatCard label="Organismos estatales" value={String(stateBodies)} icon={Landmark} />
        <StatCard
          label="Saldo por pagar"
          value={formatMoney(totalBalance, currency)}
          icon={Building2}
          tone={totalBalance > 0 ? "warning" : "success"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="proveedor">Proveedores</TabsTrigger>
            <TabsTrigger value="organismo_estatal">Organismos estatales</TabsTrigger>
            <TabsTrigger value="otro">Otros</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o identificación fiscal"
          className="max-w-xs"
        />
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">
          No pudimos cargar los proveedores: {(error as Error).message}
        </p>
      )}

      <section className="surface-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proveedor</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Identificación fiscal</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead className="text-right">Documentos</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" /> Cargando proveedores…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  No hay proveedores para este filtro.
                </TableCell>
              </TableRow>
            )}
            {visible.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.legal_name ?? "—"}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={s.party_kind === "proveedor" ? "default" : "secondary"}>
                    {PARTY_KIND_LABEL[s.party_kind as SupplierPartyKind]}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{s.tax_id ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {s.email ?? "—"}
                  <br />
                  {s.phone ?? ""}
                </TableCell>
                <TableCell className="text-right">{s.docs}</TableCell>
                <TableCell className="text-right font-medium">
                  {s.balance > 0 ? formatMoney(s.balance, s.docCurrency) : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Activo" : "Inactivo"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDraft({
                        id: s.id,
                        party_kind: (s.party_kind as SupplierPartyKind) ?? "proveedor",
                        name: s.name,
                        legal_name: s.legal_name ?? "",
                        tax_id: s.tax_id ?? "",
                        email: s.email ?? "",
                        phone: s.phone ?? "",
                        cost_center: s.cost_center ?? "",
                        is_active: s.is_active,
                      });
                      setOpen(true);
                    }}
                  >
                    <Pencil className="mr-1.5 h-4 w-4" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={toggleActive.isPending}
                    onClick={() => toggleActive.mutate({ id: s.id, is_active: s.is_active })}
                  >
                    {s.is_active ? "Dar de baja" : "Reactivar"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.id ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
            <DialogDescription>
              Los organismos estatales se cargan acá y quedan disponibles en la categoría correspondiente de cuentas a
              pagar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipo de tercero</Label>
                <Select value={draft.party_kind} onValueChange={(v) => set("party_kind", v as SupplierPartyKind)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proveedor">Proveedor comercial</SelectItem>
                    <SelectItem value="organismo_estatal">Organismo estatal</SelectItem>
                    <SelectItem value="otro">Otro tercero</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sup-name">Nombre</Label>
                <Input id="sup-name" value={draft.name} onChange={(e) => set("name", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sup-legal">Razón social</Label>
                <Input id="sup-legal" value={draft.legal_name} onChange={(e) => set("legal_name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sup-tax">Identificación fiscal</Label>
                <Input id="sup-tax" value={draft.tax_id} onChange={(e) => set("tax_id", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="sup-mail">Email</Label>
                <Input id="sup-mail" type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sup-phone">Teléfono</Label>
                <Input id="sup-phone" value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sup-cc">Centro de costo</Label>
                <Input id="sup-cc" value={draft.cost_center} onChange={(e) => set("cost_center", e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={!draft.name || save.isPending} onClick={() => save.mutate()}>
              {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
