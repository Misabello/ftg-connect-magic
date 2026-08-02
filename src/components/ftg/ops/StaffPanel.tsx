import { useState } from "react";
import { Trash2, UserPlus } from "lucide-react";

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
import { ROLE_LABEL, STAFF_ROLES } from "@/lib/ftg/operations";

export type StaffRow = {
  id: string;
  person_name: string;
  role: string;
  point_of_sale_id: string | null;
  shift_start: string | null;
  shift_end: string | null;
};

export type StaffDraft = {
  person_name: string;
  role: string;
  point_of_sale_id: string | null;
  shift_start: string;
  shift_end: string;
};

export function StaffPanel({
  staff,
  posOptions,
  disabled,
  onAdd,
  onRemove,
}: {
  staff: StaffRow[];
  posOptions: { id: string; name: string }[];
  disabled?: boolean;
  onAdd: (draft: StaffDraft) => void;
  onRemove: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>("cajero");
  const [posId, setPosId] = useState<string>("sin-puesto");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");

  const submit = () => {
    if (!name.trim()) return;
    onAdd({
      person_name: name.trim(),
      role,
      point_of_sale_id: posId === "sin-puesto" ? null : posId,
      shift_start: start,
      shift_end: end,
    });
    setName("");
  };

  return (
    <section className="surface-card p-5">
      <h2 className="text-sm font-semibold">Personal asignado</h2>

      <ul className="mt-4 space-y-2">
        {staff.length === 0 && (
          <li className="rounded-xl bg-surface p-4 text-center text-sm text-muted-foreground">
            Todavía no hay personal asignado a esta jornada.
          </li>
        )}
        {staff.map((person) => {
          const pos = posOptions.find((p) => p.id === person.point_of_sale_id);
          return (
            <li key={person.id} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{person.person_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {ROLE_LABEL[person.role] ?? person.role}
                  {pos ? ` · ${pos.name}` : ""}
                  {person.shift_start ? ` · ${person.shift_start.slice(0, 5)}–${(person.shift_end ?? "").slice(0, 5)}` : ""}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Quitar ${person.person_name}`}
                disabled={disabled}
                onClick={() => onRemove(person.id)}
                className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="staff-name">Nombre y apellido</Label>
          <Input
            id="staff-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Ana Torres"
            className="mt-1"
          />
        </div>
        <div>
          <Label>Función</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAFF_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Puesto</Label>
          <Select value={posId} onValueChange={setPosId}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sin-puesto">Sin puesto fijo</SelectItem>
              {posOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="staff-start">Desde</Label>
          <Input id="staff-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="staff-end">Hasta</Label>
          <Input id="staff-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1" />
        </div>
        <div className="sm:col-span-2">
          <Button type="button" onClick={submit} disabled={disabled || !name.trim()} className="w-full">
            <UserPlus className="mr-2 h-4 w-4" />
            Asignar a la jornada
          </Button>
        </div>
      </div>
    </section>
  );
}