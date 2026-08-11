import { useQuery } from "@tanstack/react-query";
import { Download, HardDrive, RefreshCw, Upload, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SyncDayButton } from "@/components/ftg/sync/SyncDayButton";
import { useDaySync } from "@/hooks/useDaySync";
import { useScope } from "@/hooks/useScope";
import { formatMoney, relativeTime } from "@/lib/ftg/format";
import { ENTITY_LABELS, deviceIdentifier, listPending, putOperation, setSyncMode, syncMode } from "@/lib/ftg/offline.db";
import { downloadBundle, exportEmergencyBundle, importEmergencyBundle, type EmergencyBundle } from "@/lib/ftg/sync.emergency";
import { listSyncBatches } from "@/lib/ftg/sync.functions";

export function SyncCenter() {
  const { online, activeLocation } = useScope();
  const { operations, pendingData, pendingFiles, errored, lastSync, start } = useDaySync();
  const [storage, setStorage] = useState<string>("—");
  const [mode, setMode] = useState<"automatico" | "manual">("automatico");
  const [passphrase, setPassphrase] = useState("");

  useEffect(() => {
    setMode(syncMode());
    void navigator.storage?.estimate?.().then((estimate) => {
      if (estimate?.usage) setStorage(`${(estimate.usage / 1024 / 1024).toFixed(1)} MB`);
    });
  }, []);

  const { data: batches = [], refetch } = useQuery({
    queryKey: ["sync-batches"],
    queryFn: () => listSyncBatches({ data: { limit: 20 } }),
  });

  const counts = pendingData.reduce<Record<string, number>>((acc, op) => {
    acc[op.entityType] = (acc[op.entityType] ?? 0) + 1;
    return acc;
  }, {});

  const handleExport = async () => {
    if (!passphrase || passphrase.length < 8) {
      toast.error("Ingresá una clave de al menos 8 caracteres para cifrar el lote");
      return;
    }
    const pending = await listPending();
    if (pending.length === 0) {
      toast.info("No hay operaciones pendientes para exportar");
      return;
    }
    const bundle = await exportEmergencyBundle(pending, passphrase);
    downloadBundle(bundle);
    toast.success(`Lote de emergencia generado (${bundle.operationCount} operaciones)`);
  };

  const handleImport = async (file: File) => {
    if (!passphrase) {
      toast.error("Ingresá la clave del lote para importarlo");
      return;
    }
    try {
      const bundle = JSON.parse(await file.text()) as EmergencyBundle;
      const ops = await importEmergencyBundle(bundle, passphrase);
      for (const op of ops) await putOperation({ ...op, syncStatus: "pendiente", attempts: 0 });
      toast.success(`${ops.length} operaciones importadas. Ya podés sincronizarlas.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo importar el lote");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              {online ? <Wifi className="size-4 text-primary" /> : <WifiOff className="size-4 text-destructive" />}
              Centro de sincronización
            </CardTitle>
            <CardDescription>
              {activeLocation?.name ?? "Sin sede"} · Dispositivo {deviceIdentifier().slice(0, 8)} · Última sincronización{" "}
              {lastSync ? relativeTime(lastSync) : "sin registros"}
            </CardDescription>
          </div>
          <SyncDayButton />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Operaciones pendientes</p>
            <p className="text-2xl font-semibold">{pendingData.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Archivos pendientes</p>
            <p className="text-2xl font-semibold">{pendingFiles.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Con error o revisión</p>
            <p className="text-2xl font-semibold">{errored.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <HardDrive className="size-3" /> Espacio local
            </p>
            <p className="text-2xl font-semibold">{storage}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pendientes por tipo</CardTitle>
            <CardDescription>Se envían respetando las dependencias de la jornada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.keys(counts).length === 0 && <p className="text-sm text-muted-foreground">Todo está sincronizado.</p>}
            {Object.entries(counts).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-sm">
                <span>{ENTITY_LABELS[type as keyof typeof ENTITY_LABELS] ?? type}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
            <div className="flex items-center justify-between pt-4">
              <div>
                <Label htmlFor="sync-mode">Sincronización automática</Label>
                <p className="text-xs text-muted-foreground">Envía al detectar conexión, sin interrumpir la venta.</p>
              </div>
              <Switch
                id="sync-mode"
                checked={mode === "automatico"}
                onCheckedChange={(checked) => {
                  const next = checked ? "automatico" : "manual";
                  setMode(next);
                  setSyncMode(next);
                }}
              />
            </div>
            <Button variant="outline" className="w-full" onClick={() => void start()}>
              <RefreshCw className="mr-2 size-4" /> Reintentar pendientes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Errores y revisiones</CardTitle>
            <CardDescription>Los conflictos quedan marcados y no se resuelven automáticamente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {errored.length === 0 && <p className="text-sm text-muted-foreground">Sin errores registrados.</p>}
            {errored.slice(0, 12).map((op) => (
              <div key={op.id} className="rounded-md border p-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{op.label ?? ENTITY_LABELS[op.entityType]}</span>
                  <Badge variant={op.syncStatus === "requiere_revision" ? "secondary" : "destructive"}>
                    {op.syncStatus === "requiere_revision" ? "Requiere revisión" : "Error"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{op.lastError ?? "Sin detalle"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lote de emergencia</CardTitle>
          <CardDescription>
            Archivo cifrado y firmado con las operaciones pendientes, sin credenciales, para importar desde otro
            dispositivo autorizado.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1">
            <Label htmlFor="bundle-key">Clave del lote</Label>
            <Input
              id="bundle-key"
              type="password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <Button variant="outline" onClick={() => void handleExport()}>
            <Download className="mr-2 size-4" /> Exportar lote de emergencia
          </Button>
          <Button variant="outline" asChild>
            <label className="cursor-pointer">
              <Upload className="mr-2 size-4" /> Importar lote
              <input
                type="file"
                accept=".ftgsync,application/json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleImport(file);
                  event.target.value = "";
                }}
              />
            </label>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Historial de lotes</CardTitle>
            <CardDescription>Comprobantes de cada sincronización de jornada.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="size-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead>Jornada</TableHead>
                <TableHead className="text-right">Operaciones</TableHead>
                <TableHead>Importes</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Todavía no hay lotes sincronizados desde este usuario.
                  </TableCell>
                </TableRow>
              )}
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-mono text-xs">{batch.id.slice(0, 8)}</TableCell>
                  <TableCell>{batch.business_date}</TableCell>
                  <TableCell className="text-right">{batch.operation_count}</TableCell>
                  <TableCell>
                    {Object.entries((batch.totals_by_currency ?? {}) as Record<string, number>)
                      .map(([currency, value]) => formatMoney(Number(value), currency))
                      .join(" · ") || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={batch.status === "completado" ? "default" : "secondary"}>{batch.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {operations.length === 0 && (
        <p className="text-sm text-muted-foreground">Este dispositivo no tiene operaciones registradas localmente.</p>
      )}
    </div>
  );
}
