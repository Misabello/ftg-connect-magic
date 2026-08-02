import { useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/ftg/format";
import {
  INCIDENT_CATEGORIES,
  INCIDENT_STATUS_LABEL,
  SEVERITY_LABEL,
  SEVERITY_TONE,
  type IncidentSeverity,
  type IncidentStatus,
} from "@/lib/ftg/operations";

export type IncidentRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  created_at: string;
  resolution: string | null;
};

export type IncidentDraft = {
  title: string;
  description: string;
  category: string;
  severity: IncidentSeverity;
};

export function IncidentsPanel({
  incidents,
  disabled,
  onCreate,
  onAdvance,
}: {
  incidents: IncidentRow[];
  disabled?: boolean;
  onCreate: (draft: IncidentDraft) => void;
  onAdvance: (incident: IncidentRow, next: IncidentStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("operativo");
  const [severity, setSeverity] = useState<IncidentSeverity>("media");

  const submit = () => {
    if (!title.trim()) return;
    onCreate({ title: title.trim(), description: description.trim(), category, severity });
    setTitle("");
    setDescription("");
    setSeverity("media");
    setOpen(false);
  };

  return (
    <section className="surface-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Incidentes
        </h2>
        <Button size="sm" variant="outline" disabled={disabled} onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Reportar
        </Button>
      </div>

      <ul className="mt-4 space-y-2">
        {incidents.length === 0 && (
          <li className="rounded-xl bg-surface p-4 text-center text-sm text-muted-foreground">
            Sin incidentes registrados. Buena jornada.
          </li>
        )}
        {incidents.map((incident) => (
          <li key={incident.id} className="rounded-xl bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">{incident.title}</p>
                <p className="text-xs text-muted-foreground">
                  {incident.category} · {relativeTime(incident.created_at)} ·{" "}
                  {INCIDENT_STATUS_LABEL[incident.status]}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  SEVERITY_TONE[incident.severity],
                )}
              >
                {SEVERITY_LABEL[incident.severity]}
              </span>
            </div>
            {incident.description && (
              <p className="mt-2 text-sm text-muted-foreground">{incident.description}</p>
            )}
            {incident.status !== "resuelto" && (
              <div className="mt-3 flex gap-2">
                {incident.status === "abierto" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => onAdvance(incident, "en_curso")}
                  >
                    Tomar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={disabled}
                  onClick={() => onAdvance(incident, "resuelto")}
                >
                  Resolver
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar incidente</DialogTitle>
            <DialogDescription>
              Queda registrado en la jornada y en el tablero de la sede.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div>
              <Label htmlFor="inc-title">Título</Label>
              <Input
                id="inc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Corte de energía en el puesto 2"
                className="mt-1"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Categoría</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INCIDENT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severidad</Label>
                <Select value={severity} onValueChange={(v) => setSeverity(v as IncidentSeverity)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SEVERITY_LABEL) as IncidentSeverity[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {SEVERITY_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="inc-desc">Descripción</Label>
              <Textarea
                id="inc-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Qué pasó, impacto y acciones tomadas"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={!title.trim()}>
              Registrar incidente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}