import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/ftg/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ALL_ROLES, ROLE_LABELS, type AppRole } from "@/lib/ftg/roles";

export const Route = createFileRoute("/_authenticated/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración — FTG ONE" },
      { name: "description", content: "Sedes, puntos de venta, países, usuarios y roles de FTG ONE." },
      { property: "og:title", content: "Configuración — FTG ONE" },
      { property: "og:description", content: "Sedes, puntos de venta, países, usuarios y roles." },
    ],
  }),
  component: Configuracion,
});

const locationSchema = z.object({
  code: z.string().trim().min(2).max(20),
  name: z.string().trim().min(3).max(120),
  city: z.string().trim().max(120),
  country_code: z.string().min(2).max(2),
  currency_code: z.string().min(3).max(3),
});

function Configuracion() {
  const { roles, user } = useAuth();
  const isAdmin = roles.includes("superadmin") || roles.includes("direccion");
  const isSuperadmin = roles.includes("superadmin");
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["config"],
    queryFn: async () => {
      const [countries, currencies, locations, pos, org, profiles, userRoles] = await Promise.all([
        supabase.from("countries").select("*").order("name"),
        supabase.from("currencies").select("*").order("code"),
        supabase.from("locations").select("*").order("name"),
        supabase.from("points_of_sale").select("*").order("code"),
        supabase.from("organizations").select("*").limit(1).maybeSingle(),
        supabase.from("profiles").select("id, full_name, email"),
        supabase.from("user_roles").select("id, user_id, role"),
      ]);
      return {
        countries: countries.data ?? [],
        currencies: currencies.data ?? [],
        locations: locations.data ?? [],
        pos: pos.data ?? [],
        org: org.data,
        profiles: profiles.data ?? [],
        userRoles: userRoles.data ?? [],
      };
    },
  });

  const [form, setForm] = useState({
    code: "",
    name: "",
    city: "",
    country_code: "AR",
    currency_code: "ARS",
  });

  const createLocation = useMutation({
    mutationFn: async () => {
      const parsed = locationSchema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]!.message);
      const orgId = data?.org?.id;
      if (!orgId) throw new Error("No hay empresa configurada");
      const country = data?.countries.find((c) => c.code === parsed.data.country_code);
      const { error } = await supabase.from("locations").insert({
        organization_id: orgId,
        code: parsed.data.code.toUpperCase(),
        name: parsed.data.name,
        city: parsed.data.city,
        country_code: parsed.data.country_code,
        currency_code: parsed.data.currency_code,
        timezone: country?.timezone ?? "America/Argentina/Buenos_Aires",
      });
      if (error) throw error;
      await supabase.from("audit_logs").insert({
        organization_id: orgId,
        user_id: user?.id ?? null,
        action: "create",
        entity: "locations",
        entity_id: parsed.data.code.toUpperCase(),
        details: { name: parsed.data.name },
      });
    },
    onSuccess: () => {
      toast.success("Sede creada");
      setForm({ code: "", name: "", city: "", country_code: "AR", currency_code: "ARS" });
      void queryClient.invalidateQueries({ queryKey: ["config"] });
      void queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleRole = useMutation({
    mutationFn: async ({ userId, role, has }: { userId: string; role: AppRole; has: boolean }) => {
      if (has) {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Roles actualizados");
      void queryClient.invalidateQueries({ queryKey: ["config"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Estructura organizativa del MVP: países y monedas, sedes, puntos de venta, usuarios y roles."
      />

      <Tabs defaultValue="sedes">
        <TabsList>
          <TabsTrigger value="sedes">Sedes</TabsTrigger>
          <TabsTrigger value="pos">Puntos de venta</TabsTrigger>
          <TabsTrigger value="paises">Países y monedas</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios y roles</TabsTrigger>
        </TabsList>

        <TabsContent value="sedes" className="space-y-5 pt-5">
          {isAdmin && (
            <section className="surface-card p-6">
              <h2 className="text-base font-semibold">Nueva sede</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-5">
                <div className="space-y-2">
                  <Label htmlFor="code">Código</Label>
                  <Input
                    id="code"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="AR-MDQ"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Sede Mar del Plata"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>País</Label>
                  <Select
                    value={form.country_code}
                    onValueChange={(v) => {
                      const c = data?.countries.find((x) => x.code === v);
                      setForm({ ...form, country_code: v, currency_code: c?.currency_code ?? "ARS" });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(data?.countries ?? []).map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select
                    value={form.currency_code}
                    onValueChange={(v) => setForm({ ...form, currency_code: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(data?.currencies ?? []).map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                className="mt-5"
                disabled={createLocation.isPending}
                onClick={() => createLocation.mutate()}
              >
                {createLocation.isPending ? "Guardando…" : "Crear sede"}
              </Button>
            </section>
          )}

          <section className="surface-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Sede</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>País</TableHead>
                  <TableHead>Moneda</TableHead>
                  <TableHead>Zona horaria</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.locations ?? []).map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.code}</TableCell>
                    <TableCell>{l.name}</TableCell>
                    <TableCell>{l.city}</TableCell>
                    <TableCell>{l.country_code}</TableCell>
                    <TableCell>{l.currency_code}</TableCell>
                    <TableCell className="text-muted-foreground">{l.timezone}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        <TabsContent value="pos" className="pt-5">
          <section className="surface-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Punto de venta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Prefijo fiscal</TableHead>
                  <TableHead>Moneda</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.pos ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.code}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="capitalize">{p.pos_type.replace("_", " ")}</TableCell>
                    <TableCell>{p.fiscal_prefix}</TableCell>
                    <TableCell>{p.currency_code}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        <TabsContent value="paises" className="pt-5">
          <section className="surface-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>País</TableHead>
                  <TableHead>Moneda</TableHead>
                  <TableHead>Idioma</TableHead>
                  <TableHead>Zona horaria</TableHead>
                  <TableHead>Adaptador fiscal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.countries ?? []).map((c) => (
                  <TableRow key={c.code}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.currency_code}</TableCell>
                    <TableCell className="uppercase">{c.language}</TableCell>
                    <TableCell className="text-muted-foreground">{c.timezone}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{c.fiscal_adapter} (simulado)</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        <TabsContent value="usuarios" className="space-y-4 pt-5">
          {!isSuperadmin && (
            <p className="text-sm text-muted-foreground">
              Solo un superadministrador puede modificar roles. Se muestran los datos visibles para tu perfil.
            </p>
          )}
          <section className="surface-card divide-y divide-border">
            {(data?.profiles ?? []).map((p) => {
              const userRoleList = (data?.userRoles ?? []).filter((r) => r.user_id === p.id);
              return (
                <div key={p.id} className="space-y-3 p-5">
                  <div>
                    <p className="text-sm font-medium">{p.full_name || "Sin nombre"}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ALL_ROLES.map((role) => {
                      const has = userRoleList.some((r) => r.role === role);
                      return (
                        <button
                          key={role}
                          type="button"
                          disabled={!isSuperadmin || toggleRole.isPending}
                          onClick={() => toggleRole.mutate({ userId: p.id, role, has })}
                          className={
                            has
                              ? "rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-70"
                              : "rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary disabled:opacity-60"
                          }
                        >
                          {ROLE_LABELS[role]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}