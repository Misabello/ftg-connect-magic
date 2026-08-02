import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold tracking-tight text-primary-foreground">
        FTG
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="font-display block text-sm font-semibold">FTG ONE</span>
          <span className="block text-[11px] text-muted-foreground">Sistema Integral de Operaciones</span>
        </span>
      )}
    </div>
  );
}