import { Minus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatMoney } from "@/lib/ftg/format";
import { computeTotals, lineGross, type CartLine } from "@/lib/ftg/pos";

export function CartPanel({
  lines,
  currency,
  locale,
  onQuantity,
  onRemove,
  onPhotoCode,
  onDiscount,
  onClear,
  onCheckout,
  canCheckout,
  checkoutHint,
  posName,
}: {
  lines: CartLine[];
  currency: string;
  locale: string;
  onQuantity: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
  onPhotoCode: (productId: string, code: string) => void;
  onDiscount: (productId: string, amount: number) => void;
  onClear: () => void;
  onCheckout: () => void;
  canCheckout: boolean;
  checkoutHint: string | null;
  /** Punto de venta donde quedará asentada la venta. */
  posName?: string | null;
}) {
  const totals = computeTotals(lines);

  return (
    <aside className="surface-card flex flex-col p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Carrito</h2>
        {lines.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Vaciar
          </Button>
        )}
      </div>

      <ScrollArea className="mt-3 -mr-2 h-[22rem] pr-2">
        {lines.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Agregá productos del catálogo para comenzar la venta.
          </p>
        ) : (
          <ul className="space-y-3">
            {lines.map((line) => (
              <li key={line.productId} className="rounded-xl bg-surface p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{line.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatMoney(line.unitPrice, currency, locale)} c/u
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(line.productId)}
                    aria-label={`Quitar ${line.name}`}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Quitar unidad"
                      onClick={() => onQuantity(line.productId, -1)}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">{line.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Agregar unidad"
                      onClick={() => onQuantity(line.productId, 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-sm font-semibold">{formatMoney(lineGross(line), currency, locale)}</p>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-muted-foreground">
                    Descuento
                    <Input
                      type="number"
                      min={0}
                      value={line.discountAmount || ""}
                      onChange={(e) => onDiscount(line.productId, Number(e.target.value) || 0)}
                      className="mt-1 h-8"
                      placeholder="0"
                    />
                  </label>
                  {line.requiresPhoto && (
                    <label className="text-xs text-muted-foreground">
                      Código de foto
                      <Input
                        value={line.photoCode ?? ""}
                        onChange={(e) => onPhotoCode(line.productId, e.target.value)}
                        className="mt-1 h-8"
                        placeholder="Ej. FT-4821"
                      />
                    </label>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>

      <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <dt>Neto</dt>
          <dd>{formatMoney(totals.subtotal, currency, locale)}</dd>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <dt>Descuentos</dt>
          <dd>-{formatMoney(totals.discountTotal, currency, locale)}</dd>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <dt>Impuestos</dt>
          <dd>{formatMoney(totals.taxTotal, currency, locale)}</dd>
        </div>
        <div className="flex justify-between text-lg font-semibold text-foreground">
          <dt>Total</dt>
          <dd>{formatMoney(totals.total, currency, locale)}</dd>
        </div>
      </dl>

      <Button className="mt-4 h-auto w-full flex-col gap-0.5 py-2.5" disabled={!canCheckout} onClick={onCheckout}>
        <span className="text-sm font-semibold">Cobrar</span>
        <span className="text-[11px] font-normal opacity-80">
          Asignar a Pto Vta{posName ? `: ${posName}` : ""}
        </span>
      </Button>
      {checkoutHint && <p className="mt-2 text-center text-xs text-muted-foreground">{checkoutHint}</p>}
    </aside>
  );
}