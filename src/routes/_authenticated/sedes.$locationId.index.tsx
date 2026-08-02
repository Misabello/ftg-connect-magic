import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Plus, Store } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/ftg/PageHeader";
import { StatCard } from "@/components/ftg/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/ftg/format";

const POS_TYPES = [
  { value: "tienda", label: "Tienda" },
  { value: "kiosco", label: "Kiosco" },
  { value: "movil", label: "Móvil" },
  { value: "puesto_fotografico", label: "Puesto fotográfico" },
] as const;

export const Route = createFileRoute("/_authenticated/sedes/$locationId/")({
  head: () => ({
    meta: [
      { title: "Detalle de sede — FTG ONE" },
      { name: "description", content: "Puntos de venta, cajas y cobros de la sede." },
      { property: "og:title", content: "Detalle de sede — FTG ONE" },
      { property: "og:description", content: "Creá puntos de venta y operá caja y cobros por puesto." },
    ],
  }),
  component: SedeDetail,
});

function SedeDetail() {
  const { locationId } = Route.useParams();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", pos_type: "tienda", fiscal_prefix: "" });

  const { data: location } = useQuery({
    queryKey: ["location", locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, code, name, city, country_code, currency_code, organization_id, timezone")
        .eq("id", locationId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: posList = [] } = useQuery({
    queryKey: ["pos-detail-list", locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("points_of_sale")
        .select("id, code, name, pos_type, fiscal_prefix, currency_code, is_active, cash_sessions(id, status, opening_amount)")
        .eq("location_id", locationId)
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: salesToday = [] } = useQuery({
    queryKey: ["sales-today", locationId],
    queryFn: async () => {
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("sales")
        .select("id, total, point_of_sale_id")
        .eq("location_id", locationId)
        .eq("status", "completada")
        .gte("created_at", from.toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });

  const createPos = useMutation({
    mutationFn: async () => {
      if (!location) throw new Error("Sede no encontrada");
      if (!form.code.trim() || !form.name.trim()) throw new Error("Completá código y nombre");
      const { error } = await supabase.from("points_of_sale").insert({
        organization_id: location.organization_id,
        location_id: location.id,
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        pos_type: form.pos_type as (typeof POS_TYPES)[number]["value"],
        fiscal_prefix: form.fiscal_prefix.trim() || null,
        currency_code: location.currency_code,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Punto de venta creado");
      setOpen(false);
      setForm({ code: "", name: "", pos_type: "tienda", fiscal_prefix: "" });
      queryClient.invalidateQueries({ queryKey: ["pos-detail-list", locationId] });
      queryClient.invalidateQueries({ queryKey: ["pos-count-by-location"] });
      queryClient.invalidateQueries({ queryKey: ["pos-list"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const currency = location?.currency_code ?? "ARS";
  const locale = location?.country_code === "BR" ? "pt-BR" : "es-AR";
  const totalToday = salesToday.reduce((acc, s) => acc + Number(s.total), 0);
  const openSessions = posList.filter((p) =>
    (p.cash_sessions ?? []).some((s: { status: string }) => s.status === "abierta"),
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={location?.name ?? "Sede"}
        description={`${location?.code ?? ""} · ${location?.city ?? ""} · ${currency} · ${location?.timezone ?? ""}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/sedes">
                <ArrowLeft className="h-4 w-4" /> Sedes
              </Link>
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" /> Nuevo punto de venta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo punto de venta</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Código</Label>
                    <Input
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="FOTO-03"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Kiosco entrada norte"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={form.pos_type} onValueChange={(v) => setForm({ ...form, pos_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {POS_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prefijo fiscal</Label>
                    <Input
                      value={form.fiscal_prefix}
                      onChange={(e) => setForm({ ...form, fiscal_prefix: e.target.value })}
                      placeholder="0003"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button disabled={createPos.isPending} onClick={() => createPos.mutate()}>
                    {createPos.isPending ? "Creando…" : "Crear punto de venta"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Puntos de venta" value={String(posList.length)} icon={Store} />
        <StatCard label="Cajas abiertas" value={String(openSessions)} icon={Store} />
        <StatCard label="Ventas de hoy" value={formatMoney(totalToday, currency, locale)} icon={Store} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {posList.length === 0 && (
          <p className="surface-card p-8 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
            Esta sede todavía no tiene puntos de venta. Creá el primero para operar caja y cobros.
          </p>
        )}
        {posList.map((p) => {
          const session = (p.cash_sessions ?? []).find((s: { status: string }) => s.status === "abierta");
          const posTotal = salesToday
            .filter((s) => s.point_of_sale_id === p.id)
            .reduce((acc, s) => acc + Number(s.total), 0);
          return (
            <Link
              key={p.id}
              to="/sedes/$locationId/pos/$posId"
              params={{ locationId, posId: p.id }}
              className="surface-card space-y-3 p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.code} · {p.pos_type.replace("_", " ")}
                  </p>
                </div>
                <Badge variant={session ? "default" : "secondary"}>
                  {session ? "Caja abierta" : "Caja cerrada"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Ventas hoy: <span className="font-medium text-foreground">{formatMoney(posTotal, currency, locale)}</span>
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
