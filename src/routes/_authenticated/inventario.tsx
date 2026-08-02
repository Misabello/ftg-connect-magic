import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Boxes, PackagePlus, Truck } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/ftg/PageHeader";
import { StatCard } from "@/components/ftg/StatCard";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/hooks/useI18n";
import { useScope } from "@/hooks/useScope";
import { supabase } from "@/integrations/supabase/client";
import { formatNumber, relativeTime } from "@/lib/ftg/format";
import { MOVEMENT_LABEL, MOVEMENT_SIGN, type StockMovementKind } from "@/lib/ftg/finance";

export const Route = createFileRoute("/_authenticated/inventario")({
  head: () => ({
    meta: [
      { title: "Inventario — FTG ONE" },
      { name: "description", content: "Stock por sede, alertas de mínimo y movimientos trazables." },
      { property: "og:title", content: "Inventario — FTG ONE" },
      { property: "og:description", content: "Stock por sede, alertas de mínimo y movimientos trazables." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Inventario,
});

const MOVEMENT_OPTIONS: StockMovementKind[] = ["recepcion", "ajuste", "merma", "devolucion", "transferencia"];

function Inventario() {
  const { activeLocationId, activeLocation, locations } = useScope();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState<string>("");
  const [kind, setKind] = useState<StockMovementKind>("recepcion");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [targetLocationId, setTargetLocationId] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["inventario", activeLocationId],
    enabled: !!activeLocationId,
    queryFn: async () => {
      const [levels, movements] = await Promise.all([
        supabase
          .from("stock_levels")
          .select(
            "id, product_id, quantity, reserved_quantity, damaged_quantity, min_quantity, organization_id, products(name, sku, kind, cost)",
          )
          .eq("location_id", activeLocationId!),
        supabase
          .from("stock_movements")
          .select("id, kind, quantity, reason, reference, created_at, product_id, products(name, sku)")
          .eq("location_id", activeLocationId!)
          .order("created_at", { ascending: false })
          .limit(25),
      ]);
      if (levels.error) throw levels.error;
      if (movements.error) throw movements.error;
      return { levels: levels.data ?? [], movements: movements.data ?? [] };
    },
  });

  const levels = data?.levels ?? [];
  const movements = data?.movements ?? [];

  const totals = useMemo(() => {
    const units = levels.reduce((acc, l) => acc + Number(l.quantity), 0);
    const value = levels.reduce((acc, l) => acc + Number(l.quantity) * Number(l.products?.cost ?? 0), 0);
    const low = levels.filter((l) => Number(l.quantity) <= Number(l.min_quantity));
    const damaged = levels.reduce((acc, l) => acc + Number(l.damaged_quantity), 0);
    return { units, value, low, damaged };
  }, [levels]);

  const registerMovement = useMutation({
    mutationFn: async () => {
      const level = levels.find((l) => l.product_id === productId);
      if (!level) throw new Error("Elegí un producto con stock configurado");
      const qty = Number(quantity);
      if (!Number.isFinite(qty) || qty <= 0) throw new Error("Cantidad inválida");

      const sign = MOVEMENT_SIGN[kind];
      const nextQuantity = Number(level.quantity) + sign * qty;
      if (nextQuantity < 0) throw new Error("El movimiento deja stock negativo");

      const { data: userData } = await supabase.auth.getUser();

      const { error: movementError } = await supabase.from("stock_movements").insert({
        organization_id: level.organization_id,
        location_id: activeLocationId!,
        target_location_id: kind === "transferencia" && targetLocationId ? targetLocationId : null,
        product_id: productId,
        kind,
        quantity: qty,
        reason: reason || null,
        created_by: userData.user?.id ?? null,
      });
      if (movementError) throw movementError;

      const { error: levelError } = await supabase
        .from("stock_levels")
        .update({
          quantity: nextQuantity,
          damaged_quantity: kind === "merma" ? Number(level.damaged_quantity) + qty : level.damaged_quantity,
        })
        .eq("id", level.id);
      if (levelError) throw levelError;

      if (kind === "transferencia" && targetLocationId) {
        const { data: target } = await supabase
          .from("stock_levels")
          .select("id, quantity")
          .eq("location_id", targetLocationId)
          .eq("product_id", productId)
          .maybeSingle();
        if (target) {
          await supabase
            .from("stock_levels")
            .update({ quantity: Number(target.quantity) + qty })
            .eq("id", target.id);
        } else {
          await supabase.from("stock_levels").insert({
            organization_id: level.organization_id,
            location_id: targetLocationId,
            product_id: productId,
            quantity: qty,
          });
        }
      }
    },
    onSuccess: () => {
      toast.success("Movimiento registrado");
      setOpen(false);
      setQuantity("1");
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["inventario"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.inventario.title")}
        description={`${t("page.inventario.desc")}${activeLocation ? ` · ${activeLocation.name}` : ""}`}
        actions={
          <Button
            onClick={() => {
              setProductId(levels[0]?.product_id ?? "");
              setOpen(true);
            }}
            disabled={levels.length === 0}
          >
            <PackagePlus className="mr-1.5 h-4 w-4" /> Registrar movimiento
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Unidades en stock" value={formatNumber(totals.units)} icon={Boxes} />
          <StatCard
            label="Valorizado al costo"
            value={new Intl.NumberFormat("es-AR", {
              style: "currency",
              currency: activeLocation?.currency_code ?? "ARS",
              maximumFractionDigits: 0,
            }).format(totals.value)}
            icon={Truck}
          />
          <StatCard
            label="Productos bajo mínimo"
            value={String(totals.low.length)}
            icon={AlertTriangle}
            tone={totals.low.length ? "warning" : "success"}
            hint={totals.low.length ? "Requieren reposición" : "Sin alertas"}
          />
          <StatCard label="Unidades dañadas" value={formatNumber(totals.damaged)} tone="danger" />
        </div>
      )}

      <section className="surface-card overflow-hidden">
        <header className="flex items-center justify-between gap-3 p-5">
          <h2 className="text-base font-semibold">Stock por producto</h2>
          <Badge variant="secondary">{levels.length} productos</Badge>
        </header>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Disponible</TableHead>
              <TableHead className="text-right">Reservado</TableHead>
              <TableHead className="text-right">Dañado</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {levels.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  No hay stock configurado para esta sede.
                </TableCell>
              </TableRow>
            )}
            {levels.map((l) => {
              const low = Number(l.quantity) <= Number(l.min_quantity);
              return (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.products?.name ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{l.products?.sku ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatNumber(Number(l.quantity))}</TableCell>
                  <TableCell className="text-right">{formatNumber(Number(l.reserved_quantity))}</TableCell>
                  <TableCell className="text-right">{formatNumber(Number(l.damaged_quantity))}</TableCell>
                  <TableCell className="text-right">{formatNumber(Number(l.min_quantity))}</TableCell>
                  <TableCell>
                    <Badge variant={low ? "destructive" : "secondary"}>{low ? "Reponer" : "Normal"}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>

      <section className="surface-card p-5">
        <h2 className="text-base font-semibold">Últimos movimientos</h2>
        <ul className="mt-4 space-y-2">
          {movements.length === 0 && (
            <li className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Todavía no hay movimientos registrados.
            </li>
          )}
          {movements.map((m) => (
            <li key={m.id} className="flex items-start justify-between gap-3 rounded-xl bg-surface p-4 text-sm">
              <div>
                <p className="font-medium">
                  {MOVEMENT_LABEL[m.kind as StockMovementKind]} · {m.products?.name ?? "Producto"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {m.reason ?? m.reference ?? "Sin detalle"} · {relativeTime(m.created_at)}
                </p>
              </div>
              <span
                className={
                  MOVEMENT_SIGN[m.kind as StockMovementKind] > 0 ? "font-semibold text-success" : "font-semibold text-destructive"
                }
              >
                {MOVEMENT_SIGN[m.kind as StockMovementKind] > 0 ? "+" : "−"}
                {formatNumber(Number(m.quantity))}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar movimiento de stock</DialogTitle>
            <DialogDescription>
              Cada movimiento actualiza el stock de la sede activa y queda registrado con usuario y fecha.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Producto</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Elegí un producto" />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((l) => (
                    <SelectItem key={l.product_id} value={l.product_id}>
                      {l.products?.name ?? l.product_id} · {formatNumber(Number(l.quantity))} u.
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as StockMovementKind)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOVEMENT_OPTIONS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {MOVEMENT_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qty">Cantidad</Label>
                <Input id="qty" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
            </div>
            {kind === "transferencia" && (
              <div className="space-y-1.5">
                <Label>Sede destino</Label>
                <Select value={targetLocationId} onValueChange={setTargetLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elegí la sede destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations
                      .filter((l) => l.id !== activeLocationId)
                      .map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="reason">Motivo</Label>
              <Input
                id="reason"
                value={reason}
                placeholder="Recepción de mercadería, rotura, ajuste de conteo…"
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!productId || registerMovement.isPending}
              onClick={() => registerMovement.mutate()}
            >
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}