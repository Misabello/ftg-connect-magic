import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { GoogleAccountCard } from "@/components/ftg/GoogleAccountCard";
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
import { useI18n } from "@/hooks/useI18n";
import { LANGUAGES } from "@/lib/ftg/i18n";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ALL_ROLES, type AppRole } from "@/lib/ftg/roles";

export const Route = createFileRoute("/_authenticated/configuracion/")({
  head: () => ({
    meta: [
      { title: "Configuración — FTG ONE" },
      { name: "description", content: "Sedes, puntos de venta, países, usuarios y roles de FTG ONE." },
      { property: "og:title", content: "Configuración — FTG ONE" },
      { property: "og:description", content: "Sedes, puntos de venta, países, usuarios y roles." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search["tab"] === "string" ? (search["tab"] as string) : undefined,
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
  const { tab } = Route.useSearch();
  const { roles, user } = useAuth();
  const { t, tRole, language, setLanguage } = useI18n();
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
      <Tabs defaultValue={tab ?? "sedes"}>
        <TabsList>
          <TabsTrigger value="sedes">{t("config.tab.sedes")}</TabsTrigger>
          <TabsTrigger value="pos">{t("config.tab.pos")}</TabsTrigger>
          <TabsTrigger value="paises">{t("config.tab.paises")}</TabsTrigger>
          <TabsTrigger value="usuarios">{t("config.tab.usuarios")}</TabsTrigger>
          <TabsTrigger value="cuenta">{t("config.tab.cuenta")}</TabsTrigger>
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
              Solo un superadministrador puede dar de alta usuarios o cambiar roles.
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <Link to="/configuracion/usuarios" className="surface-card block space-y-1.5 p-5 hover:border-primary/50">
              <h2 className="text-sm font-semibold">Usuarios (ABM completo)</h2>
              <p className="text-xs text-muted-foreground">
                Alta, edición y baja de usuarios: nombre y apellido, usuario sugerido, CUIL, correo, teléfono, fecha de
                alta, rol y estado. Incluye historial de cambios y reseteo de acceso.
              </p>
              <span className="inline-block pt-1 text-xs font-medium text-primary">Abrir ABM de usuarios →</span>
            </Link>
            <Link to="/configuracion/roles" className="surface-card block space-y-1.5 p-5 hover:border-primary/50">
              <h2 className="text-sm font-semibold">Roles y permisos</h2>
              <p className="text-xs text-muted-foreground">
                Catálogo de roles técnicos y los permisos asignados a cada uno.
              </p>
              <span className="inline-block pt-1 text-xs font-medium text-primary">Ver roles y permisos →</span>
            </Link>
            <Link to="/configuracion/empleados" className="surface-card block space-y-1.5 p-5 hover:border-primary/50">
              <h2 className="text-sm font-semibold">Empleados y RR. HH.</h2>
              <p className="text-xs text-muted-foreground">Legajos, datos laborales, altas y bajas del personal.</p>
              <span className="inline-block pt-1 text-xs font-medium text-primary">Abrir empleados →</span>
            </Link>
            <Link to="/configuracion/auditoria" className="surface-card block space-y-1.5 p-5 hover:border-primary/50">
              <h2 className="text-sm font-semibold">Auditoría</h2>
              <p className="text-xs text-muted-foreground">Registro de acciones sensibles sobre usuarios y permisos.</p>
              <span className="inline-block pt-1 text-xs font-medium text-primary">Ver auditoría →</span>
            </Link>
          </div>
        </TabsContent>

        <TabsContent value="cuenta" className="space-y-6 pt-5">
          <SellerContactCard />
          <section className="surface-card space-y-4 p-6">
            <div>
              <h2 className="text-base font-semibold">{t("config.language.title")}</h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                {t("config.language.desc")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {LANGUAGES.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLanguage(l.value)}
                  className={
                    language === l.value
                      ? "rounded-xl border-2 border-primary bg-primary/5 px-5 py-3 text-sm font-medium"
                      : "rounded-xl border border-border px-5 py-3 text-sm text-muted-foreground hover:border-primary/40"
                  }
                >
                  <span className="mr-2 text-xs font-semibold tracking-wide">{l.flag}</span>
                  {l.label}
                </button>
              ))}
            </div>
          </section>
          <GoogleAccountCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Datos de contacto del vendedor usados al enviar comprobantes y recuerdos. */
function SellerContactCard() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [senderEmail, setSenderEmail] = useState(profile?.sender_email ?? profile?.email ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <section className="surface-card space-y-4 p-6">
      <div>
        <h2 className="text-base font-semibold">Mis datos de contacto</h2>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Se incluyen en los comprobantes y recuerdos que enviás al cliente por email o WhatsApp.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs text-muted-foreground">Nombre</Label>
          <Input className="mt-1" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">WhatsApp (con código de país)</Label>
          <Input
            className="mt-1"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="5492235550000"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Email emisor (desde el que enviás al cliente)</Label>
        <Input
          className="mt-1"
          type="email"
          value={senderEmail}
          onChange={(e) => setSenderEmail(e.target.value)}
          placeholder="ventas@fotografica.com"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Se usa como remitente sugerido y como contacto de respuesta en los comprobantes y recuerdos.
        </p>
      </div>
      <Button
        disabled={saving || !user}
        onClick={async () => {
          setSaving(true);
          const { error } = await supabase
            .from("profiles")
            .update({
              full_name: fullName.trim(),
              phone: phone.trim() || null,
              sender_email: senderEmail.trim() || null,
            })
            .eq("id", user!.id);
          setSaving(false);
          if (error) {
            toast.error(error.message);
            return;
          }
          await queryClient.invalidateQueries({ queryKey: ["me"] });
          toast.success("Datos actualizados");
        }}
      >
        Guardar
      </Button>
    </section>
  );
}