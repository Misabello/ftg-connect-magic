import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useScope } from "@/hooks/useScope";
import { readQueue, subscribeQueue, syncQueue, type PendingSale } from "@/lib/ftg/offline";

/** Estado de la cola offline del dispositivo y sincronización por lotes. */
export function useOfflineQueue() {
  const { online } = useScope();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PendingSale[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const refresh = () => setPending(readQueue());
    refresh();
    return subscribeQueue(refresh);
  }, []);

  const sync = useCallback(
    async (silent = false) => {
      if (syncing) return;
      if (readQueue().length === 0) {
        if (!silent) toast.info("No hay operaciones pendientes de sincronizar");
        return;
      }
      if (!navigator.onLine) {
        if (!silent) toast.error("Sin conexión: la sincronización se reintenta al volver en línea");
        return;
      }
      setSyncing(true);
      try {
        const { synced, failed } = await syncQueue();
        if (synced > 0) {
          toast.success(`${synced} venta${synced === 1 ? "" : "s"} sincronizada${synced === 1 ? "" : "s"}`);
          queryClient.invalidateQueries({ queryKey: ["session-sales"] });
          queryClient.invalidateQueries({ queryKey: ["reportes"] });
        }
        if (failed > 0) toast.error(`${failed} operación(es) quedaron pendientes de reintento`);
      } finally {
        setSyncing(false);
      }
    },
    [queryClient, syncing],
  );

  useEffect(() => {
    if (online && readQueue().length > 0) void sync(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  return { pending, pendingCount: pending.length, syncing, sync };
}
