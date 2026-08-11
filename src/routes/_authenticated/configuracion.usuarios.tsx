import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useScope } from "@/hooks/useScope";
import { supabase } from "@/integrations/supabase/client";
import {
  createUserAccount,
  listUserHistory,
  listUsers,
  resetUserAccess,
  setUserRole,
  setUserStatus,
  applyScheduledDeactivations,
  updateUserAccount,
  USER_STATUSES,
} from "@/lib/ftg/admin-users.functions";
import { USER_STATUS_LABELS } from "@/lib/ftg/hr";
import { formatCuil, isValidCuil, suggestUsername } from "@/lib/ftg/user-form";
import { CORE_ROLES, ROLE_LABELS, canManageUsers, type AppRole } from "@/lib/ftg/roles";

export const Route = createFileRoute("/_authenticated/configuracion/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuarios — Configuración FTG ONE" },
      { name: "description", content: "Alta, baja, roles y estados de los usuarios de FTG ONE." },
      { property: "og:title", content: "Usuarios — Configuración FTG ONE" },
      { property: "og:description", content: "Alta, baja, roles y estados de los usuarios." },
    ],
  }),
  component: UsuariosPage,
});

const STATUS_TONE: Record<string, string> = {
  activo: "bg-emerald-500/15 text-emerald-600",
  invitado: "bg-sky-500/15 text-sky-600",
  suspendido: "bg-amber-500/15 text-amber-600",
  baja_programada: "bg-orange-500/15 text-orange-600",
  inactivo: "bg-muted text-muted-foreground",
};

const today = () => new Date().toISOString().slice(0, 10);

function UsuariosPage() {
  const { roles } = useAuth();
  const isAdmin = canManageUsers(roles);
  const { locations } = useScope();
  const queryClient = useQueryClient();

  const fetchUsers = useServerFn(listUsers);
  const createFn = useServerFn(createUserAccount);
  const updateFn = useServerFn(updateUserAccount);
  const statusFn = useServerFn(setUserStatus);
  const roleFn = useServerFn(setUserRole);
  const resetFn = useServerFn(resetUserAccess);
  const historyFn = useServerFn(listUserHistory);
  const scheduledFn = useServerFn(applyScheduledDeactivations);

  const { data } = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchUsers({}) });
  const { data: refs } = useQuery({
    queryKey: ["admin-users-refs"],
    queryFn: async () => {
      const [orgs, countries, pos] = await Promise.all([
        supabase.from("organizations").select("id, name").order("name"),
        supabase.from("countries").select("code, name").order("name"),
        supabase.from("points_of_sale").select("id, name, location_id").order("name"),
      ]);
      return { orgs: orgs.data ?? [], countries: countries.data ?? [], pos: pos.data ?? [] };
    },
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [roleFilter, setRoleFilter] = useState("todos");
  const [openCreate, setOpenCreate] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [historyFor, setHistoryFor] = useState<{ id: string; name: string } | null>(null);
  const [rolesFor, setRolesFor] = useState<{ id: string; name: string } | null>(null);

  const rolesByUser = useMemo(() => {
    const map = new Map<string, AppRole[]>();
    for (const r of data?.roles ?? []) {
      const list = map.get(r.user_id) ?? [];
      if (!list.includes(r.role as AppRole)) list.push(r.role as AppRole);
      map.set(r.user_id, list);
    }
    return map;
  }, [data]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.profiles ?? []).filter((p) => {
      const userRoles = rolesByUser.get(p.id) ?? [];
      if (statusFilter !== "todos" && (p.status ?? "activo") !== statusFilter) return false;
      if (roleFilter !== "todos" && !userRoles.includes(roleFilter as AppRole)) return false;
      if (!term) return true;
      return `${p.full_name ?? ""} ${p.email ?? ""} ${p.username ?? ""} ${p.tax_id ?? ""}`.toLowerCase().includes(term);
    });
  }, [data, rolesByUser, search, statusFilter, roleFilter]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    void queryClient.invalidateQueries({ queryKey: ["me"] });
  };

  const changeStatus = useMutation({
    mutationFn: (input: { user_id: string; status: (typeof USER_STATUSES)[number] }) => statusFn({ data: input }),
    onSuccess: () => {
      toast.success("Estado actualizado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleRole = useMutation({
    mutationFn: (input: { user_id: string; role: string; enabled: boolean }) => roleFn({ data: input }),
    onSuccess: () => {
      toast.success("Rol actualizado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reset = useMutation({
    mutationFn: (input: { user_id: string; email: string }) => resetFn({ data: input }),
    onSuccess: () => toast.success("Enviamos el enlace de restablecimiento"),
    onError: (e: Error) => toast.error(e.message),
  });

  const runScheduled = useMutation({
    mutationFn: () => scheduledFn({}),
    onSuccess: (res: { processed: number }) => {
      toast.success(`Bajas programadas aplicadas: ${res.processed}`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: history } = useQuery({
    queryKey: ["user-history", historyFor?.id],
    enabled: !!historyFor,
    queryFn: () => historyFn({ data: { user_id: historyFor!.id } }),
  });

  const exportCsv = () => {
    const header = ["Nombre", "Usuario", "Email", "Teléfono", "CUIL", "Puesto", "Roles", "Estado", "Alta", "Baja", "Último acceso"];
    const lines = rows.map((p) =>
      [
        p.full_name ?? "",
        p.username ?? "",
        p.email ?? "",
        p.phone ?? "",
        p.tax_id ?? "",
        p.job_title ?? "",
        (rolesByUser.get(p.id) ?? []).join(" / "),
        USER_STATUS_LABELS[p.status ?? "activo"] ?? p.status,
        p.start_date ?? "",
        p.end_date ?? "",
        p.last_sign_in_at ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "usuarios-ftg.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="max-w-xs"
          placeholder="Buscar por nombre o correo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {USER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {USER_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los roles</SelectItem>
            {CORE_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={exportCsv}>
            Exportar
          </Button>
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => runScheduled.mutate()} disabled={runScheduled.isPending}>
                Aplicar bajas programadas
              </Button>
              <Button onClick={() => setOpenCreate(true)}>Crear usuario</Button>
            </>
          )}
        </div>
      </div>

      {!isAdmin && (
        <p className="text-sm text-muted-foreground">
          Solo el rol Administrador puede crear usuarios, asignar roles y dar de baja o reactivar cuentas.
        </p>
      )}

      <section className="surface-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Sede</TableHead>
              <TableHead>CUIL</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Alta</TableHead>
              <TableHead>Baja</TableHead>
              <TableHead>Último acceso</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => {
              const userRoles = rolesByUser.get(p.id) ?? [];
              const status = p.status ?? "activo";
              const loc = locations.find((l) => l.id === p.default_location_id);
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="font-medium">{p.full_name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Sin nombre"}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.username ? `@${p.username}` : "sin usuario"}
                      {p.job_title ? ` · ${p.job_title}` : ""}
                    </p>
                  </TableCell>
                  <TableCell className="text-xs">
                    <p>{p.email ?? "—"}</p>
                    <p className="text-muted-foreground">{p.phone ?? "—"}</p>
                  </TableCell>
                  <TableCell className="text-xs">
                    {userRoles.map((r) => ROLE_LABELS[r] ?? r).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-xs">{loc?.name ?? "—"}</TableCell>
                  <TableCell className="text-xs">{p.tax_id ?? "—"}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_TONE[status] ?? ""}`}>
                      {USER_STATUS_LABELS[status] ?? status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">{p.start_date ?? "—"}</TableCell>
                  <TableCell className="text-xs">{p.end_date ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.last_sign_in_at ? new Date(p.last_sign_in_at).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => setHistoryFor({ id: p.id, name: p.full_name ?? "" })}>
                        Historial
                      </Button>
                      {isAdmin && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => setEditUser(p)}>
                            Editar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setRolesFor({ id: p.id, name: p.full_name ?? "" })}>
                            Rol
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!p.email || reset.isPending}
                            onClick={() => reset.mutate({ user_id: p.id, email: p.email! })}
                          >
                            Restablecer
                          </Button>
                          {status === "inactivo" || status === "suspendido" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => changeStatus.mutate({ user_id: p.id, status: "activo" })}
                            >
                              Reactivar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (confirm(`¿Dar de baja el acceso de ${p.full_name || p.email}? Se conserva todo su historial.`))
                                  changeStatus.mutate({ user_id: p.id, status: "inactivo" });
                              }}
                            >
                              Dar de baja
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                  No hay usuarios que coincidan con la búsqueda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <UserFormDialog
        open={openCreate}
        onOpenChange={(o) => setOpenCreate(o)}
        refs={refs}
        locations={locations}
        employees={data?.employees ?? []}
        takenUsernames={(data?.profiles ?? []).map((p: any) => p.username).filter(Boolean) as string[]}
        onSubmit={async (payload) => {
          await createFn({ data: payload });
          toast.success("Usuario creado");
          invalidate();
        }}
      />

      <UserFormDialog
        key={editUser?.id ?? "edit"}
        open={!!editUser}
        onOpenChange={(o) => !o && setEditUser(null)}
        refs={refs}
        locations={locations}
        employees={data?.employees ?? []}
        takenUsernames={(data?.profiles ?? [])
          .filter((p: any) => p.id !== editUser?.id)
          .map((p: any) => p.username)
          .filter(Boolean) as string[]}
        initial={editUser ?? undefined}
        onSubmit={async (payload) => {
          await updateFn({ data: { ...payload, user_id: editUser.id } as never });
          toast.success("Usuario actualizado");
          invalidate();
          setEditUser(null);
        }}
      />

      <Dialog open={!!rolesFor} onOpenChange={(o) => !o && setRolesFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Roles de {rolesFor?.name}</DialogTitle>
            <DialogDescription>En esta etapa todos los roles acceden a los módulos operativos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {CORE_ROLES.map((role) => {
              const has = (rolesByUser.get(rolesFor?.id ?? "") ?? []).includes(role);
              return (
                <div key={role} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="text-sm">{ROLE_LABELS[role]}</span>
                  <Switch
                    checked={has}
                    onCheckedChange={(v) => rolesFor && toggleRole.mutate({ user_id: rolesFor.id, role, enabled: v })}
                  />
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyFor} onOpenChange={(o) => !o && setHistoryFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historial de {historyFor?.name}</DialogTitle>
            <DialogDescription>Acciones administrativas registradas en auditoría.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {(history ?? []).map((h: any) => (
              <div key={h.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="font-medium">{h.action}</span>
                  <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
                </div>
                {h.details && (
                  <pre className="mt-1 whitespace-pre-wrap text-[11px] text-muted-foreground">
                    {JSON.stringify(h.details)}
                  </pre>
                )}
              </div>
            ))}
            {(history ?? []).length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Sin movimientos registrados.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type UserFormRefs =
  | {
      orgs: { id: string; name: string }[];
      countries: { code: string; name: string }[];
      pos: { id: string; name: string; location_id: string | null }[];
    }
  | undefined;

function UserFormDialog({
  open,
  onOpenChange,
  refs,
  locations,
  employees,
  takenUsernames,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  refs: UserFormRefs;
  locations: { id: string; name: string }[];
  employees: any[];
  takenUsernames: string[];
  initial?: any;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const isEdit = !!initial;
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(isEdit);
  const [form, setForm] = useState({
    first_name: initial?.first_name ?? "",
    last_name: initial?.last_name ?? "",
    username: initial?.username ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    tax_id: initial?.tax_id ?? "",
    document_number: initial?.document_number ?? "",
    birth_date: initial?.birth_date ?? "",
    job_title: initial?.job_title ?? "",
    notes: initial?.notes ?? "",
    role: "seller" as string,
    organization_id: initial?.organization_id ?? "",
    country_code: initial?.country_code ?? "AR",
    default_location_id: initial?.default_location_id ?? "",
    point_of_sale_ids: [] as string[],
    start_date: initial?.start_date ?? today(),
    end_date: initial?.end_date ?? "",
    send_invite: true,
    employee_id: "",
  });

  const orgId = form.organization_id || refs?.orgs[0]?.id || "";
  const posOptions = (refs?.pos ?? []).filter(
    (p) => !form.default_location_id || p.location_id === form.default_location_id,
  );
  const suggestion = suggestUsername(form.first_name, form.last_name, takenUsernames);
  const usernameTaken =
    !!form.username && takenUsernames.some((u) => u.toLowerCase() === form.username.trim().toLowerCase());
  const cuilInvalid = !!form.tax_id && !isValidCuil(form.tax_id);

  const setNames = (patch: { first_name?: string; last_name?: string }) => {
    const next = { ...form, ...patch };
    if (!usernameTouched) next.username = suggestUsername(next.first_name, next.last_name, takenUsernames);
    setForm(next);
  };

  const basePayload = () => ({
    first_name: form.first_name,
    last_name: form.last_name,
    username: form.username.trim() || null,
    email: form.email,
    phone: form.phone || null,
    tax_id: form.tax_id || null,
    document_number: form.document_number || null,
    birth_date: form.birth_date || null,
    job_title: form.job_title || null,
    notes: form.notes || null,
    country_code: form.country_code || null,
    default_location_id: form.default_location_id || null,
    start_date: form.start_date,
    end_date: form.end_date || null,
  });

  const submit = async () => {
    setSaving(true);
    try {
      await onSubmit(
        isEdit
          ? basePayload()
          : {
              ...basePayload(),
              role: form.role,
              organization_id: orgId || null,
              point_of_sale_ids: form.point_of_sale_ids,
              send_invite: form.send_invite,
              employee_id: form.employee_id || null,
            },
      );
      onOpenChange(false);
      setStep(0);
      if (!isEdit)
        setForm({
          ...form,
          first_name: "",
          last_name: "",
          username: "",
          email: "",
          phone: "",
          tax_id: "",
          document_number: "",
          birth_date: "",
          job_title: "",
          notes: "",
          point_of_sale_ids: [],
          employee_id: "",
        });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const canContinue =
    !!form.first_name && !!form.last_name && !!form.email && !usernameTaken && !cuilInvalid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Editar ${initial?.full_name ?? "usuario"}` : "Crear usuario"}</DialogTitle>
          <DialogDescription>
            Paso {step + 1} de 2 · {step === 0 ? "Datos personales y RR. HH." : "Alcance, rol y vigencia"}
          </DialogDescription>
        </DialogHeader>

        {step === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">Nombre</Label>
              <Input className="mt-1" value={form.first_name} onChange={(e) => setNames({ first_name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Apellido</Label>
              <Input className="mt-1" value={form.last_name} onChange={(e) => setNames({ last_name: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Nombre de usuario</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={form.username}
                  placeholder={suggestion || "nombre.apellido"}
                  onChange={(e) => {
                    setUsernameTouched(true);
                    setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "") });
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!suggestion}
                  onClick={() => {
                    setUsernameTouched(true);
                    setForm({ ...form, username: suggestion });
                  }}
                >
                  Sugerir
                </Button>
              </div>
              <p className={`mt-1 text-[11px] ${usernameTaken ? "text-destructive" : "text-muted-foreground"}`}>
                {usernameTaken ? "Ese nombre de usuario ya está en uso." : `Sugerido: ${suggestion || "—"}`}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Correo</Label>
              <Input className="mt-1" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Teléfono</Label>
              <Input className="mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+54 9 11 …" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">CUIL / CUIT</Label>
              <Input
                className="mt-1"
                inputMode="numeric"
                value={form.tax_id}
                placeholder="20-12345678-9"
                onChange={(e) => setForm({ ...form, tax_id: formatCuil(e.target.value) })}
              />
              {cuilInvalid && <p className="mt-1 text-[11px] text-destructive">CUIL/CUIT inválido.</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Documento (DNI)</Label>
              <Input
                className="mt-1"
                value={form.document_number}
                onChange={(e) => setForm({ ...form, document_number: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Fecha de nacimiento</Label>
              <Input
                className="mt-1"
                type="date"
                value={form.birth_date}
                onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Puesto</Label>
              <Input
                className="mt-1"
                value={form.job_title}
                onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                placeholder="Cajero, Fotógrafo…"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Notas de RR. HH. (opcional)</Label>
              <Textarea
                className="mt-1"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {!isEdit && (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground">Rol</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CORE_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Empleado vinculado (opcional)</Label>
                  <Select
                    value={form.employee_id || "none"}
                    onValueChange={(v) => setForm({ ...form, employee_id: v === "none" ? "" : v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sin vincular" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin vincular</SelectItem>
                      {employees
                        .filter((e) => !e.user_id)
                        .map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.last_name}, {e.first_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Empresa</Label>
                  <Select value={orgId} onValueChange={(v) => setForm({ ...form, organization_id: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(refs?.orgs ?? []).map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">País</Label>
              <Select value={form.country_code} onValueChange={(v) => setForm({ ...form, country_code: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(refs?.countries ?? []).map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Sede principal</Label>
              <Select
                value={form.default_location_id || "none"}
                onValueChange={(v) =>
                  setForm({ ...form, default_location_id: v === "none" ? "" : v, point_of_sale_ids: [] })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Fecha de alta</Label>
              <Input className="mt-1" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Fecha de baja (opcional)</Label>
              <Input className="mt-1" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
            {!isEdit && (
              <>
                <div className="sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Puntos de venta asignados</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {posOptions.map((p) => {
                      const active = form.point_of_sale_ids.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              point_of_sale_ids: active
                                ? form.point_of_sale_ids.filter((id) => id !== p.id)
                                : [...form.point_of_sale_ids, p.id],
                            })
                          }
                          className={
                            active
                              ? "rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                              : "rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
                          }
                        >
                          {p.name}
                        </button>
                      );
                    })}
                    {posOptions.length === 0 && <Badge variant="secondary">Sin puntos de venta en la sede</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:col-span-2">
                  <Switch checked={form.send_invite} onCheckedChange={(v) => setForm({ ...form, send_invite: v })} />
                  <span className="text-sm">Enviar invitación por correo</span>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 1 && (
            <Button variant="outline" onClick={() => setStep(0)}>
              Atrás
            </Button>
          )}
          {step === 0 ? (
            <Button disabled={!canContinue} onClick={() => setStep(1)}>
              Continuar
            </Button>
          ) : (
            <Button disabled={saving} onClick={submit}>
              {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear usuario"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
