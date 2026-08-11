import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useScope } from "@/hooks/useScope";
import { supabase } from "@/integrations/supabase/client";
import {
  CONTRACT_TYPES,
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_STATUS_LABELS,
  seniorityFrom,
} from "@/lib/ftg/hr";
import { endEmployeeAssignment, listEmployees, saveEmployee, saveEmployeeAssignment } from "@/lib/ftg/hr.functions";

export const Route = createFileRoute("/_authenticated/configuracion/empleados")({
  head: () => ({
    meta: [
      { title: "Empleados y RR. HH. — FTG ONE" },
      { name: "description", content: "Legajos, contratos, asignaciones a sedes y antigüedad del personal FTG." },
      { property: "og:title", content: "Empleados y RR. HH. — FTG ONE" },
      { property: "og:description", content: "Legajos y asignaciones del personal FTG." },
    ],
  }),
  component: EmpleadosPage,
});

const today = () => new Date().toISOString().slice(0, 10);

type EmployeeForm = {
  id?: any;
  organization_id?: any;
  user_id?: any;
  employee_number?: any;
  first_name?: any;
  last_name?: any;
  document_type?: any;
  document_number?: any;
  tax_id?: any;
  birth_date?: any;
  nationality?: any;
  gender?: any;
  marital_status?: any;
  personal_email?: any;
  phone?: any;
  address?: any;
  city?: any;
  region?: any;
  country_code?: any;
  emergency_contact_name?: any;
  emergency_contact_phone?: any;
  position?: any;
  department?: any;
  supervisor_employee_id?: any;
  contract_type?: any;
  work_schedule?: any;
  work_shift?: any;
  hire_date?: any;
  termination_date?: any;
  termination_reason?: any;
  employment_status?: any;
  primary_location_id?: any;
  primary_point_of_sale_id?: any;
  cost_center?: any;
  reference_currency?: any;
  notes?: any;
  created_at?: any;
  updated_at?: any;
  created_by?: any;
};

const emptyEmployee = (organization_id: string): EmployeeForm => ({
  organization_id,
  first_name: "",
  last_name: "",
  employee_number: "",
  document_type: "DNI",
  document_number: "",
  tax_id: "",
  birth_date: "",
  nationality: "",
  personal_email: "",
  phone: "",
  address: "",
  city: "",
  country_code: "AR",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  position: "",
  department: "",
  contract_type: CONTRACT_TYPES[0],
  work_schedule: "",
  work_shift: "",
  hire_date: today(),
  termination_date: "",
  termination_reason: "",
  employment_status: "activo",
  primary_location_id: null,
  primary_point_of_sale_id: null,
  cost_center: "",
  reference_currency: "ARS",
  notes: "",
});

function EmpleadosPage() {
  const { profile } = useAuth();
  const { locations } = useScope();
  const queryClient = useQueryClient();

  const fetchEmployees = useServerFn(listEmployees);
  const saveFn = useServerFn(saveEmployee);
  const assignFn = useServerFn(saveEmployeeAssignment);
  const endAssignFn = useServerFn(endEmployeeAssignment);

  const { data } = useQuery({ queryKey: ["hr-employees"], queryFn: () => fetchEmployees({}) });
  const { data: pos } = useQuery({
    queryKey: ["hr-pos"],
    queryFn: async () => (await supabase.from("points_of_sale").select("id, name, location_id").order("name")).data ?? [],
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EmployeeForm | null>(null);
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.employees ?? []).filter((e: any) => {
      if (statusFilter !== "todos" && e.employment_status !== statusFilter) return false;
      if (!term) return true;
      return `${e.first_name} ${e.last_name} ${e.employee_number ?? ""} ${e.document_number ?? ""}`
        .toLowerCase()
        .includes(term);
    });
  }, [data, search, statusFilter]);

  const openNew = () => {
    setForm(emptyEmployee(profile?.organization_id ?? ""));
    setOpen(true);
  };
  const openEdit = (row: any) => {
    setForm({ ...emptyEmployee(profile?.organization_id ?? ""), ...row });
    setOpen(true);
  };

  const set = (key: string, value: unknown) => setForm((f) => ({ ...(f ?? {}), [key]: value }));

  const submit = async () => {
    if (!form?.organization_id) {
      toast.error("Tu perfil no tiene empresa asignada.");
      return;
    }
    setSaving(true);
    try {
      const payload: EmployeeForm = { ...form };
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.created_by;
      await saveFn({ data: payload });
      toast.success("Legajo guardado");
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["hr-employees"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const assignments = (employeeId: string) =>
    (data?.assignments ?? []).filter((a: any) => a.employee_id === employeeId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="max-w-xs"
          placeholder="Buscar por nombre, legajo o documento…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {EMPLOYMENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {EMPLOYMENT_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button className="ml-auto" onClick={openNew}>
          Nuevo legajo
        </Button>
      </div>

      <section className="surface-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Puesto</TableHead>
              <TableHead>Sede</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Ingreso</TableHead>
              <TableHead>Antigüedad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e: any) => (
              <TableRow key={e.id}>
                <TableCell>
                  <p className="font-medium">
                    {e.last_name}, {e.first_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {e.employee_number ? `Legajo ${e.employee_number}` : e.document_number || "—"}
                  </p>
                </TableCell>
                <TableCell className="text-xs">{e.position ?? "—"}</TableCell>
                <TableCell className="text-xs">
                  {locations.find((l) => l.id === e.primary_location_id)?.name ?? "—"}
                </TableCell>
                <TableCell className="text-xs">{e.contract_type ?? "—"}</TableCell>
                <TableCell className="text-xs">{e.hire_date ?? "—"}</TableCell>
                <TableCell className="text-xs">{seniorityFrom(e.hire_date, e.termination_date)}</TableCell>
                <TableCell className="text-xs">
                  {EMPLOYMENT_STATUS_LABELS[e.employment_status as keyof typeof EMPLOYMENT_STATUS_LABELS] ??
                    e.employment_status}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(e)}>
                    Abrir legajo
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  Todavía no hay legajos cargados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{form?.id ? "Legajo del empleado" : "Nuevo legajo"}</SheetTitle>
            <SheetDescription>Datos personales, laborales y asignaciones a sedes o puntos de venta.</SheetDescription>
          </SheetHeader>

          {form && (
            <Tabs defaultValue="personales" className="mt-4">
              <TabsList>
                <TabsTrigger value="personales">Personales</TabsTrigger>
                <TabsTrigger value="laborales">Laborales</TabsTrigger>
                <TabsTrigger value="asignaciones" disabled={!form.id}>
                  Asignaciones
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personales" className="grid gap-3 pt-4 sm:grid-cols-2">
                <Field label="Nombre" value={form.first_name} onChange={(v) => set("first_name", v)} />
                <Field label="Apellido" value={form.last_name} onChange={(v) => set("last_name", v)} />
                <Field label="Nº de legajo" value={form.employee_number} onChange={(v) => set("employee_number", v)} />
                <Field label="Tipo de documento" value={form.document_type} onChange={(v) => set("document_type", v)} />
                <Field label="Documento" value={form.document_number} onChange={(v) => set("document_number", v)} />
                <Field label="CUIT / NIF" value={form.tax_id} onChange={(v) => set("tax_id", v)} />
                <Field label="Fecha de nacimiento" type="date" value={form.birth_date} onChange={(v) => set("birth_date", v)} />
                <Field label="Nacionalidad" value={form.nationality} onChange={(v) => set("nationality", v)} />
                <Field label="Email personal" type="email" value={form.personal_email} onChange={(v) => set("personal_email", v)} />
                <Field label="Teléfono" value={form.phone} onChange={(v) => set("phone", v)} />
                <Field label="Domicilio" value={form.address} onChange={(v) => set("address", v)} />
                <Field label="Ciudad" value={form.city} onChange={(v) => set("city", v)} />
                <Field label="Contacto de emergencia" value={form.emergency_contact_name} onChange={(v) => set("emergency_contact_name", v)} />
                <Field label="Teléfono de emergencia" value={form.emergency_contact_phone} onChange={(v) => set("emergency_contact_phone", v)} />
              </TabsContent>

              <TabsContent value="laborales" className="grid gap-3 pt-4 sm:grid-cols-2">
                <Field label="Puesto" value={form.position} onChange={(v) => set("position", v)} />
                <Field label="Área / departamento" value={form.department} onChange={(v) => set("department", v)} />
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo de contrato</Label>
                  <Select value={form.contract_type ?? ""} onValueChange={(v) => set("contract_type", v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRACT_TYPES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Estado laboral</Label>
                  <Select value={form.employment_status} onValueChange={(v) => set("employment_status", v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {EMPLOYMENT_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Field label="Jornada" value={form.work_schedule} onChange={(v) => set("work_schedule", v)} />
                <Field label="Turno" value={form.work_shift} onChange={(v) => set("work_shift", v)} />
                <Field label="Fecha de ingreso" type="date" value={form.hire_date} onChange={(v) => set("hire_date", v)} />
                <Field label="Fecha de egreso" type="date" value={form.termination_date} onChange={(v) => set("termination_date", v)} />
                <Field label="Motivo de egreso" value={form.termination_reason} onChange={(v) => set("termination_reason", v)} />
                <div>
                  <Label className="text-xs text-muted-foreground">Sede principal</Label>
                  <Select
                    value={form.primary_location_id ?? "none"}
                    onValueChange={(v) => set("primary_location_id", v === "none" ? null : v)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
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
                <Field label="Centro de costo" value={form.cost_center} onChange={(v) => set("cost_center", v)} />
                <Field label="Moneda de referencia" value={form.reference_currency} onChange={(v) => set("reference_currency", v)} />
                <div className="sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Notas</Label>
                  <Textarea className="mt-1" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Antigüedad calculada: <strong>{seniorityFrom(form.hire_date, form.termination_date)}</strong>
                </p>
              </TabsContent>

              <TabsContent value="asignaciones" className="space-y-3 pt-4">
                {assignments(form.id).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <div>
                      <p>{locations.find((l) => l.id === a.location_id)?.name ?? "Sin sede"}</p>
                      <p className="text-xs text-muted-foreground">
                        {(pos ?? []).find((p) => p.id === a.point_of_sale_id)?.name ?? "Sin punto de venta"} ·{" "}
                        {a.valid_from} → {a.valid_to ?? "vigente"}
                      </p>
                    </div>
                    {!a.valid_to && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await endAssignFn({ data: { id: a.id, valid_to: today() } });
                          toast.success("Asignación cerrada");
                          void queryClient.invalidateQueries({ queryKey: ["hr-employees"] });
                        }}
                      >
                        Cerrar
                      </Button>
                    )}
                  </div>
                ))}
                <AssignmentForm
                  locations={locations}
                  pos={pos ?? []}
                  onSubmit={async (payload) => {
                    await assignFn({ data: { employee_id: form.id, ...payload } });
                    toast.success("Asignación agregada");
                    void queryClient.invalidateQueries({ queryKey: ["hr-employees"] });
                  }}
                />
              </TabsContent>
            </Tabs>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={saving} onClick={submit}>
              {saving ? "Guardando…" : "Guardar legajo"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: unknown;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input className="mt-1" type={type} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function AssignmentForm({
  locations,
  pos,
  onSubmit,
}: {
  locations: { id: string; name: string }[];
  pos: { id: string; name: string; location_id: string | null }[];
  onSubmit: (payload: { location_id: string | null; point_of_sale_id: string | null; valid_from: string }) => Promise<void>;
}) {
  const [locationId, setLocationId] = useState<string>("none");
  const [posId, setPosId] = useState<string>("none");
  const [from, setFrom] = useState(today());

  return (
    <div className="grid gap-3 rounded-lg border border-dashed border-border p-3 sm:grid-cols-4">
      <div className="sm:col-span-1">
        <Label className="text-xs text-muted-foreground">Sede</Label>
        <Select value={locationId} onValueChange={(v) => { setLocationId(v); setPosId("none"); }}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin sede</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Punto de venta</Label>
        <Select value={posId} onValueChange={setPosId}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin puesto</SelectItem>
            {pos
              .filter((p) => locationId === "none" || p.location_id === locationId)
              .map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Desde</Label>
        <Input className="mt-1" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div className="flex items-end">
        <Button
          className="w-full"
          onClick={() =>
            onSubmit({
              location_id: locationId === "none" ? null : locationId,
              point_of_sale_id: posId === "none" ? null : posId,
              valid_from: from,
            })
          }
        >
          Agregar
        </Button>
      </div>
    </div>
  );
}
