import { CheckCircle2, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useDaySync } from "@/hooks/useDaySync";
import { useScope } from "@/hooks/useScope";
import { SyncDayDialog } from "@/components/ftg/sync/SyncDayDialog";

type Props = {
  posName?: string | undefined;
  cashSessionLabel?: string | undefined;
  userName?: string | undefined;
  variant?: "default" | "outline" | "secondary" | undefined;
  size?: "default" | "sm" | "lg" | undefined;
  className?: string | undefined;
};

/** Botón único "Sincronizar operaciones del día", con estados visuales. */
export function SyncDayButton({ posName, cashSessionLabel, userName, variant = "default", size = "default", className }: Props) {
  const { online } = useScope();
  const { pendingCount, progress, awaiting } = useDaySync();
  const [open, setOpen] = useState(false);

  const syncing = progress.phase === "enviando" || progress.phase === "preparando" || progress.phase === "verificando";
  const nothing = pendingCount === 0;

  const label = syncing
    ? "Sincronizando…"
    : nothing
      ? "Todo está sincronizado"
      : !online
        ? awaiting
          ? "Esperando conexión"
          : "Sin conexión · guardado local"
        : `Sincronizar operaciones del día (${pendingCount})`;

  const Icon = syncing ? Loader2 : nothing ? CheckCircle2 : !online ? CloudOff : RefreshCw;

  return (
    <>
      <Button
        variant={nothing ? "outline" : variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        disabled={syncing}
      >
        <Icon className={`mr-2 size-4 ${syncing ? "animate-spin" : ""}`} />
        {label}
      </Button>
      <SyncDayDialog
        open={open}
        onOpenChange={setOpen}
        posName={posName}
        cashSessionLabel={cashSessionLabel}
        userName={userName}
      />
    </>
  );
}
