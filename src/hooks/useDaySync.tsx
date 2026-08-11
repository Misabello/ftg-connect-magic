import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  listOperations,
  listPending,
  migrateLegacyQueue,
  pruneConfirmed,
  subscribeQueue,
  syncMode,
  type PendingOperation,
} from "@/lib/ftg/offline.db";
import { emptyProgress, runDaySync, type SyncProgress } from "@/lib/ftg/sync.engine";

const AWAITING_KEY = "ftg.offline.awaiting";
const LAST_SYNC_KEY = "ftg.offline.last_sync";

let progressState: SyncProgress = emptyProgress;
let running = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setProgress(next: SyncProgress) {
  progressState = next;
  emit();
}

export function lastSyncAt(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LAST_SYNC_KEY);
}

export function isAwaitingConnection(): boolean {
  return typeof window !== "undefined" && window.localStorage.getItem(AWAITING_KEY) === "1";
}

function setAwaiting(value: boolean) {
  if (typeof window === "undefined") return;
  if (value) window.localStorage.setItem(AWAITING_KEY, "1");
  else window.localStorage.removeItem(AWAITING_KEY);
}

/** Estado compartido de la sincronización de la jornada (continúa en segundo plano). */
export function useDaySync() {
  const queryClient = useQueryClient();
  const [progress, setLocalProgress] = useState<SyncProgress>(progressState);
  const [operations, setOperations] = useState<PendingOperation[]>([]);
  const [awaiting, setAwaitingState] = useState(false);

  useEffect(() => {
    const listener = () => setLocalProgress(progressState);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const all = await listOperations();
      if (active) setOperations(all);
      setAwaitingState(isAwaitingConnection());
    };
    void (async () => {
      await migrateLegacyQueue();
      await pruneConfirmed();
      await refresh();
    })();
    return subscribeQueue(() => void refresh());
  }, []);

  const pending = operations.filter((op) => op.syncStatus !== "sincronizada" && op.syncStatus !== "ya_existia");
  const pendingData = pending.filter((op) => op.entityType !== "file");
  const pendingFiles = pending.filter((op) => op.entityType === "file");

  const start = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (running) return progressState;
      const items = await listPending();
      const data = items.filter((op) => op.entityType !== "file");
      if (data.length === 0) {
        if (!opts.silent) toast.info("Todo está sincronizado");
        setProgress({ ...emptyProgress, phase: "completado", currentLabel: "Todo está sincronizado" });
        return progressState;
      }
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setAwaiting(true);
        setAwaitingState(true);
        setProgress({ ...emptyProgress, phase: "sin_conexion", total: data.length, pending: data.length });
        if (!opts.silent) {
          toast.warning(
            "No hay conexión. Tus operaciones están guardadas en este dispositivo y se sincronizarán cuando vuelva Internet.",
          );
        }
        return progressState;
      }

      running = true;
      try {
        const result = await runDaySync({ operations: data, onProgress: setProgress });
        setAwaiting(false);
        setAwaitingState(false);
        if (typeof window !== "undefined") window.localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
        queryClient.invalidateQueries({ queryKey: ["session-sales"] });
        queryClient.invalidateQueries({ queryKey: ["reportes"] });
        if (!opts.silent) {
          if (result.phase === "completado") toast.success("Jornada sincronizada");
          else if (result.phase === "parcial") toast.warning("Algunas operaciones requieren atención");
        }
        return result;
      } finally {
        running = false;
        emit();
      }
    },
    [queryClient],
  );

  // Al volver la conexión: aviso y, en modo automático, envío inmediato.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline = async () => {
      const items = (await listPending()).filter((op) => op.entityType !== "file");
      if (items.length === 0) return;
      if (syncMode() === "automatico" || isAwaitingConnection()) {
        toast.info("Volvió la conexión: sincronizando operaciones pendientes");
        void start({ silent: true });
      } else {
        toast.info("Volvió la conexión. Podés sincronizar las operaciones del día con un clic.");
      }
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [start]);

  // Advertencia si el usuario cierra la app con una sincronización activa.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (running) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  return {
    operations,
    pending,
    pendingData,
    pendingFiles,
    pendingCount: pendingData.length,
    filesCount: pendingFiles.length,
    errored: pending.filter((op) => op.syncStatus === "error" || op.syncStatus === "requiere_revision"),
    progress,
    running,
    awaiting,
    lastSync: lastSyncAt(),
    start,
  };
}
