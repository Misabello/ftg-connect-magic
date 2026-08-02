import { CheckCircle2, Circle } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { checklistProgress, type ChecklistPhase } from "@/lib/ftg/operations";

export type ChecklistItem = {
  id: string;
  phase: string;
  label: string;
  is_required: boolean;
  is_done: boolean;
  done_at: string | null;
};

export function ChecklistPanel({
  items,
  phase,
  title,
  disabled,
  onToggle,
}: {
  items: ChecklistItem[];
  phase: ChecklistPhase;
  title: string;
  disabled?: boolean;
  onToggle: (item: ChecklistItem) => void;
}) {
  const scoped = items.filter((i) => i.phase === phase);
  const { done, total, pct } = checklistProgress(items, phase);

  return (
    <section className="surface-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">
          {done}/{total} completado
        </span>
      </div>
      <Progress value={pct} className="mt-3 h-1.5" />

      <ul className="mt-4 space-y-1">
        {scoped.length === 0 && (
          <li className="rounded-xl bg-surface p-4 text-center text-sm text-muted-foreground">
            Sin ítems en esta etapa.
          </li>
        )}
        {scoped.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onToggle(item)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                "hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              {item.is_done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className={cn("flex-1", item.is_done && "text-muted-foreground line-through")}>
                {item.label}
                {!item.is_required && (
                  <span className="ml-2 text-[11px] text-muted-foreground">(opcional)</span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}