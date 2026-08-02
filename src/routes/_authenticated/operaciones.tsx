import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CalendarPlus, Target, Users } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/ftg/PageHeader";
import { StatCard } from "@/components/ftg/StatCard";
import { ChecklistPanel, type ChecklistItem } from "@/components/ftg/ops/ChecklistPanel";
import {
  IncidentsPanel,
  type IncidentDraft,
  type IncidentRow,
} from "@/components/ftg/ops/IncidentsPanel";
import { StaffPanel, type StaffDraft, type StaffRow } from "@/components/ftg/ops/StaffPanel";
import { StatusBadge } from "@/components/ftg/ops/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { useScope } from "@/hooks/useScope";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, formatNumber } from "@/lib/ftg/format";
import {
  DEFAULT_CHECKLIST,
  STATUS_FLOW,
  STATUS_LABEL,
  checklistProgress,
  type IncidentStatus,
  type OperationalStatus,
} from "@/lib/ftg/operations";

export const Route = createFileRoute("/_authenticated/operaciones")({
  head: () => ({
    meta: [
      { title: "Operaciones — FTG ONE" },
      { name: "description", content: "Jornadas operativas, checklists, personal e incidentes por sede." },
      { property: "og:title", content: "Operaciones — FTG ONE" },
      {
        property: "og:description",
        content: "Tablero de jornadas, checklists de apertura y cierre, personal asignado e incidentes.",
      },
    ],
  }),
  component: Operaciones,
});

type OperationDay = {
  id: string;
  organization_id: string;
  location_id: string;
  event_id: string | null;
  venue_id: string | null;
  day: string;
  status: OperationalStatus;
  manager_name: string | null;
  sales_target: number | null;
  expected_visitors: number | null;
  opened_at: string | null;
  closed_at: string | null;
  notes: string | null;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function Operaciones() {
  const { activeLocation, activeLocationId } = useScope();
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  const currency = activeLocation?.currency_code ?? "ARS";
  const locale = activeLocation?.country_code === "BR" ? "pt-BR" : "es-AR";

  const { data: days = [] } = useQuery({
    queryKey: ["operation-days", activeLocationId],
    enabled: !!activeLocationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operation_days")
        .select(
          "id, organization_id, location_id, event_id, venue_id, day, status, manager_name, sales_target, expected_visitors, opened_at, closed_at, notes",
        )
        .eq("location_id", activeLocationId!)
        .order("day", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as OperationDay[];
    },
  });

  const activeDay = days.find((d) => d.id === selectedDayId) ?? days[0] ?? null;

  useEffect(() => {
    if (days.length && !days.some((d) => d.id === selectedDayId)) {
      setSelectedDayId(days[0]!.id);
    }
  }, [days, selectedDayId]);

  const { data: posOptions = [] } = useQuery({
    queryKey: ["ops-pos", activeLocationId],
    enabled: !!activeLocationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("points_of_sale")
        .select("id, name")
        .eq("location_id", activeLocationId!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: checklist = [] } = useQuery({
    queryKey: ["ops-checklist", activeDay?.id],
    enabled: !!activeDay,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operation_checklist_items")
        .select("id, phase, label, is_required, is_done, done_at")
        .eq("operation_day_id", activeDay!.id)
        .order("sort_order");
      if (error) throw error;
      return data as ChecklistItem[];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["ops-staff", activeDay?.id],
    enabled: !!activeDay,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operation_staff")
        .select("id, person_name, role, point_of_sale_id, shift_start, shift_end")
        .eq("operation_day_id", activeDay!.id)
        .order("created_at");
      if (error) throw error;
      return data as StaffRow[];
    },
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["ops-incidents", activeDay?.id],
    enabled: !!activeDay,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operation_incidents")
        .select("id, title, description, category, severity, status, created_at, resolution")
        .eq("operation_day_id", activeDay!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as IncidentRow[];
    },
  });

  const { data: daySales } = useQuery({
    queryKey: ["ops-sales", activeDay?.id, activeDay?.day],
    enabled: !!activeDay,
    queryFn: async () => {
      const from = `${activeDay!.day}T00:00:00`;
      const to = `${activeDay!.day}T23:59:59`;
      const { data, error } = await supabase
        .from("sales")
        .select("total")
        .eq("location_id", activeDay!.location_id)
        .eq("status", "completada")
        .gte("created_at", from)
        .lte("created_at", to);
      if (error) throw error;
      return (data ?? []).reduce((acc, s) => acc + Number(s.total), 0);
    },
  });

  const invalidateDay = () => {
    void queryClient.invalidateQueries({ queryKey: ["ops-checklist", activeDay?.id] });
    void queryClient.invalidateQueries({ queryKey: ["ops-staff", activeDay?.id] });
    void queryClient.invalidateQueries({ queryKey: ["ops-incidents", activeDay?.id] });
    void queryClient.invalidateQueries({ queryKey: ["operation-days", activeLocationId] });
  };

  const createDay = useMutation({
    mutationFn: async () => {
      if (!activeLocationId) throw new Error("Seleccioná una sede");
      const { data: loc, error: locError } = await supabase
        .from("locations")
        .select("organization_id")
        .eq("id", activeLocationId)
        .single();
      if (locError) throw locError;

      const { data: day, error } = await supabase
        .from("operation_days")
        .insert({
          organization_id: loc.organization_id,
          location_id: activeLocationId,
          day: today(),
          status: "planificado",
          manager_name: null,
        })
        .select("id")
        .single();
      if (error) throw error;

      const items = DEFAULT_CHECKLIST.map((item, index) => ({
        operation_day_id: day.id,
        phase: item.phase,
        label: item.label,
        is_required: item.is_required,
        sort_order: index + 1,
      }));
      const { error: itemsError } = await supabase.from("operation_checklist_items").insert(items);
      if (itemsError) throw itemsError;
      return day.id;
    },
    onSuccess: (id) => {
      setSelectedDayId(id);
      invalidateDay();
      toast.success("Jornada creada con checklist base");
    },
    onError: (error: Error) =>
      toast.error(
        error.message.includes("duplicate")
          ? "Ya existe una jornada de hoy para esta sede"
          : error.message,
      ),
  });

  const setStatus = useMutation({
    mutationFn: async (status: OperationalStatus) => {
      if (!activeDay) return;
      const patch: {
        status: OperationalStatus;
        opened_at?: string;
        opened_by?: string | null;
        closed_at?: string;
        closed_by?: string | null;
      } = { status };
      if (status === "en_operacion" && !activeDay.opened_at) {
        patch['opened_at'] = new Date().toISOString();
        patch['opened_by'] = user?.id ?? null;
      }
      if (status === "cerrado") {
        patch['closed_at'] = new Date().toISOString();
        patch['closed_by'] = user?.id ?? null;
      }
      const { error } = await supabase.from("operation_days").update(patch).eq("id", activeDay.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateDay();
      toast.success("Estado de la jornada actualizado");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleItem = useMutation({
    mutationFn: async (item: ChecklistItem) => {
      const done = !item.is_done;
      const { error } = await supabase
        .from("operation_checklist_items")
        .update({
          is_done: done,
          done_at: done ? new Date().toISOString() : null,
          done_by: done ? (user?.id ?? null) : null,
        })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ops-checklist", activeDay?.id] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const addStaff = useMutation({
    mutationFn: async (draft: StaffDraft) => {
      if (!activeDay) return;
      const { error } = await supabase.from("operation_staff").insert({
        operation_day_id: activeDay.id,
        person_name: draft.person_name,
        role: draft.role as "cajero",
        point_of_sale_id: draft.point_of_sale_id,
        shift_start: draft.shift_start || null,
        shift_end: draft.shift_end || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ops-staff", activeDay?.id] });
      toast.success("Persona asignada");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeStaff = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("operation_staff").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ops-staff", activeDay?.id] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const createIncident = useMutation({
    mutationFn: async (draft: IncidentDraft) => {
      if (!activeDay) return;
      const { error } = await supabase.from("operation_incidents").insert({
        operation_day_id: activeDay.id,
        organization_id: activeDay.organization_id,
        location_id: activeDay.location_id,
        category: draft.category,
        severity: draft.severity,
        title: draft.title,
        description: draft.description || null,
        reported_by: user?.id ?? null,
      });
      if (error) throw error;
      if (activeDay.status !== "cerrado" && draft.severity !== "baja") {
        await supabase.from("operation_days").update({ status: "incidente" }).eq("id", activeDay.id);
      }
    },
    onSuccess: () => {
      invalidateDay();
      toast.success("Incidente registrado");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const advanceIncident = useMutation({
    mutationFn: async ({ incident, next }: { incident: IncidentRow; next: IncidentStatus }) => {
      const { error } = await supabase
        .from("operation_incidents")
        .update({
          status: next,
          resolved_at: next === "resuelto" ? new Date().toISOString() : null,
          resolved_by: next === "resuelto" ? (user?.id ?? null) : null,
        })
        .eq("id", incident.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ops-incidents", activeDay?.id] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const openProgress = useMemo(() => checklistProgress(checklist, "apertura"), [checklist]);
  const closeProgress = useMemo(() => checklistProgress(checklist, "cierre"), [checklist]);
  const openIncidents = incidents.filter((i) => i.status !== "resuelto").length;
  const closed = activeDay?.status === "cerrado";
  const target = Number(activeDay?.sales_target ?? 0);
  const sold = daySales ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.operaciones.title")}
        description={t("page.operaciones.desc")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {days.length > 0 && (
              <Select value={activeDay?.id ?? ""} onValueChange={setSelectedDayId}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Jornada" />
                </SelectTrigger>
                <SelectContent>
                  {days.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.day} · {STATUS_LABEL[d.status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={() => createDay.mutate()} disabled={createDay.isPending}>
              <CalendarPlus className="mr-2 h-4 w-4" />
              Nueva jornada
            </Button>
          </div>
        }
      />

      {!activeDay && (
        <div className="surface-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Todavía no hay jornadas para {activeLocation?.name ?? "esta sede"}. Creá la primera para
            habilitar checklists, personal e incidentes.
          </p>
        </div>
      )}

      {activeDay && (
        <>
          <section className="surface-card flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold">Jornada del {activeDay.day}</h2>
                <StatusBadge status={activeDay.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeLocation?.name ?? "Sede"} ·{" "}
                {activeDay.manager_name ? `Responsable: ${activeDay.manager_name}` : "Sin responsable asignado"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUS_FLOW.filter((s) => s !== activeDay.status).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={status === "cerrado" ? "destructive" : "outline"}
                  disabled={setStatus.isPending}
                  onClick={() => setStatus.mutate(status)}
                >
                  {STATUS_LABEL[status]}
                </Button>
              ))}
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Apertura"
              value={`${openProgress.done}/${openProgress.total}`}
              hint={`${openProgress.pct}% del checklist`}
              tone={openProgress.pct === 100 ? "success" : "warning"}
            />
            <StatCard
              label="Cierre"
              value={`${closeProgress.done}/${closeProgress.total}`}
              hint={`${closeProgress.pct}% del checklist`}
              tone={closeProgress.pct === 100 ? "success" : "default"}
            />
            <StatCard
              label="Personal"
              value={formatNumber(staff.length, locale)}
              hint="asignados a la jornada"
              icon={Users}
            />
            <StatCard
              label="Incidentes abiertos"
              value={formatNumber(openIncidents, locale)}
              hint={`${incidents.length} en total`}
              icon={AlertTriangle}
              tone={openIncidents > 0 ? "danger" : "success"}
            />
          </div>

          {target > 0 && (
            <section className="surface-card flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Target className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs tracking-wide text-muted-foreground uppercase">Objetivo del día</p>
                  <p className="text-lg font-semibold">
                    {formatMoney(sold, currency, locale)}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      de {formatMoney(target, currency, locale)}
                    </span>
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {Math.round((sold / target) * 100)}% cumplido
              </p>
            </section>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <ChecklistPanel
              items={checklist}
              phase="apertura"
              title="Checklist de apertura"
              disabled={closed || toggleItem.isPending}
              onToggle={(item) => toggleItem.mutate(item)}
            />
            <ChecklistPanel
              items={checklist}
              phase="cierre"
              title="Checklist de cierre"
              disabled={closed || toggleItem.isPending}
              onToggle={(item) => toggleItem.mutate(item)}
            />
            <StaffPanel
              staff={staff}
              posOptions={posOptions}
              disabled={closed || addStaff.isPending}
              onAdd={(draft) => addStaff.mutate(draft)}
              onRemove={(id) => removeStaff.mutate(id)}
            />
            <IncidentsPanel
              incidents={incidents}
              disabled={createIncident.isPending}
              onCreate={(draft) => createIncident.mutate(draft)}
              onAdvance={(incident, next) => advanceIncident.mutate({ incident, next })}
            />
          </div>
        </>
      )}
    </div>
  );
}