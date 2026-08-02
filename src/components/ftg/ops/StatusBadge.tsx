import { cn } from "@/lib/utils";
import { STATUS_LABEL, STATUS_TONE, type OperationalStatus } from "@/lib/ftg/operations";

export function StatusBadge({ status, className }: { status: OperationalStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        STATUS_TONE[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}