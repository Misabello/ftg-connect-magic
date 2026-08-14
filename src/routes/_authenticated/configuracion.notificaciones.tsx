import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/ftg/PageHeader";
import { ExportSheetButton } from "@/components/ftg/admin/ReportShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useScope } from "@/hooks/useScope";
import { supabase } from "@/integrations/supabase/client";
import { CLOSE_SENDER_EMAIL } from "@/lib/ftg/pos-close";

export const Route = createFileRoute("/_authenticated/configuracion/notificaciones")({
  head: () => ({
    meta: [
      { title: "Notificaciones de punto de venta — FTG ONE" },
      { name: "description", content: "Destinatarios que reciben el aviso de cierre de caja por email." },
      { property: "og:title", content: "Notificaciones de punto de venta — FTG ONE" },
      { property: "og:description", content: "ABM de destinatarios para los avisos de cierre de caja." },
    ],
  }),
  component: NotificacionesPos,
});

const HEADERS = ["Nombre", "Email", "Rol", "Sede", "Punto de venta", "Estado"];

function NotificacionesPos() {
  const queryClient = useQueryClient();
  const { locations } = useScope();
  const [form, setForm] = useState({ full_name: "", email: "", role_label: "", location_id: "all", point_of_sale_id: "all" });

  const { data: organizationId } = useQuery({
    queryKey: ["notif-org-id"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("id").limit(1).maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },
  });

  const { data: posList = [] } = useQuery({
    queryKey: ["pos-notif-pos", form.location_id],
    queryFn: async () => {
      let q = supabase.from("points_of_sale").select("id, name, code, location_id").eq("is_active", true).order("name");
      if (form.location_id !== "all") q = q.eq("location_id", form.location_id);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: recipients = [], isLoading } = useQuery({
    queryKey: ["pos-notification-recipients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pos_notification_recipients")
        .select("id, full_name, email, role_label, is_active, location_id, point_of_sale_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.email.trim()) throw new Error("Ingresá un email de destino.");
      if (!organizationId) throw new Error("No pudimos identificar la organización.");
      const { error } = await supabase.from("pos_notification_recipients").insert({
        full_name: form.full_name.trim() || form.email.trim(),
        email: form.email.trim().toLowerCase(),
        role_label: form.role_label.trim() || null,
        organization_id: organizationId,
        location_id: form.location_id === "all" ? null : form.location_id,
        point_of_sale_id: form.point_of_sale_id === "all" ? null : form.point_of_sale_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Destinatario agregado");
      setForm({ full_name: "", email: "", role_label: "", location_id: "all", point_of_sale_id: "all" });
      queryClient.invalidateQueries({ queryKey: ["pos-notification-recipients"] });
    },
    onError: (e: Error) => toast.error("No pudimos guardar el destinatario", { description: e.message }),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("pos_notification_recipients").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pos-notification-recipients"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pos_notification_recipients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Destinatario eliminado");
      queryClient.invalidateQueries({ queryKey: ["pos-notification-recipients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const locName = (id: string | null) => locations.find((l) => l.id === id)?.name ?? "Todas";
  const posName = (id: string | null) => posList.find((p) => p.id === id)?.name ?? "Todos";

  const rows = recipients.map((r) => ({
    Nombre: r.full_name ?? "",
    Email: r.email,
    Rol: r.role_label ?? "",
    Sede: locName(r.location_id),
    "Punto de venta": posName(r.point_of_sale_id),
    Estado: r.is_active ? "Activo" : "Pausado",
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notificaciones / Punto de venta"
        description={`Quiénes reciben el aviso de cierre de caja. Emisor configurado: ${CLOSE_SENDER_EMAIL}`}
        actions={
          <ExportSheetButton title="Destinatarios de cierre de caja" headers={HEADERS} getRows={() => rows} />
        }
      />

      <div className="surface-card space-y-4 p-5">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <UserPlus className="h-4 w-4 text-primary" /> Nuevo destinatario
        </p>
        <div className="grid gap-3 md:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nombre</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="nombre@empresa.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Rol / referencia</Label>
            <Input value={form.role_label} onChange={(e) => setForm({ ...form, role_label: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Sede</Label>
            <Select
              value={form.location_id}
              onValueChange={(v) => setForm({ ...form, location_id: v, point_of_sale_id: "all" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Punto de venta</Label>
            <Select value={form.point_of_sale_id} onValueChange={(v) => setForm({ ...form, point_of_sale_id: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {posList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button size="sm" disabled={create.isPending} onClick={() => create.mutate()}>
          <Mail className="mr-1.5 h-4 w-4" /> Agregar destinatario
        </Button>
      </div>

      <div className="surface-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {HEADERS.map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Cargando destinatarios…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && recipients.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Todavía no hay destinatarios configurados.
                </TableCell>
              </TableRow>
            )}
            {recipients.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.full_name}</TableCell>
                <TableCell>{r.email}</TableCell>
                <TableCell>{r.role_label ?? "—"}</TableCell>
                <TableCell>{locName(r.location_id)}</TableCell>
                <TableCell>{posName(r.point_of_sale_id)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!!r.is_active}
                      onCheckedChange={(v) => toggle.mutate({ id: r.id, is_active: v })}
                    />
                    <Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Activo" : "Pausado"}</Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => remove.mutate(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}