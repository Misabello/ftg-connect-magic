import { createFileRoute } from "@tanstack/react-router";

import { EmptyState, Loading, Panel } from "@/components/ftg/supervision/SupervisionShell";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useScope } from "@/hooks/useScope";
import { useSupervision } from "@/hooks/useSupervision";
import { relativeTime } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/supervisores/operativo")({
  head: () => ({
    meta: [
      { title: "Control operativo — Supervisores FTG ONE" },
      { name: "description", content: "Apertura, cierre, checklist y personal de la jornada del parque." },
      { property: "og:title", content: "Control operativo — Supervisores FTG ONE" },
      { property: "og:description", content: "Seguimiento de la jornada operativa del parque." },
    ],
  }),
  component: ControlOperativo,
});

function ControlOperativo() {
  const { activeLocationId } = useScope();
  const { data, isLoading } = useSupervision(activeLocationId);
  if (isLoading || !data) return <Loading />;

  const opDay = data.operationDay;
  const apertura = data.checklist.filter((c: any) => c.phase === "apertura");
  const cierre = data.checklist.filter((c: any) => c.phase === "cierre");
  const done = (list: any[]) => list.filter((c) => c.is_done).length;

  return (
    <div className="space-y-4">
      <Panel title="Jornada" hint={data.day}>
        {!opDay ? (
          <EmptyState message="Todavía no se abrió la jornada operativa de hoy." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Estado</p>
              <Badge variant="secondary" className="mt-1">{opDay.status}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Responsable</p>
              <p className="mt-1">{opDay.manager_name ?? "Sin asignar"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Apertura</p>
              <p className="mt-1">{opDay.opened_at ? relativeTime(opDay.opened_at) : "Pendiente"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cierre</p>
              <p className="mt-1">{opDay.closed_at ? relativeTime(opDay.closed_at) : "Pendiente"}</p>
            </div>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {[
          { title: "Checklist de apertura", list: apertura },
          { title: "Checklist de cierre", list: cierre },
        ].map(({ title, list }) => (
          <Panel key={title} title={title} hint={`${done(list)} de ${list.length} completados`}>
            {list.length === 0 ? (
              <EmptyState message="Sin tareas cargadas." />
            ) : (
              <>
                <Progress value={list.length ? (done(list) / list.length) * 100 : 0} />
                <ul className="mt-3 space-y-1.5 text-sm">
                  {list.map((c: any) => (
                    <li key={c.id} className="flex items-center justify-between gap-3">
                      <span className={c.is_done ? "text-muted-foreground line-through" : ""}>{c.title}</span>
                      <span className="text-xs text-muted-foreground">{c.is_done ? "OK" : "Pendiente"}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>
        ))}
      </div>

      <Panel title="Personal de la jornada" hint="Turnos y roles asignados">
        {data.staff.length === 0 ? (
          <EmptyState message="Sin personal asignado." />
        ) : (
          <ul className="divide-y divide-border text-sm">
            {data.staff.map((s: any) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="font-medium">{s.person_name}</span>
                <span className="text-xs text-muted-foreground">
                  {s.role} · {s.shift_start ?? "—"} a {s.shift_end ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
