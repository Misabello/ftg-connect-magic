import { useEffect, useState, useSyncExternalStore } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShoppingCart, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useScope } from "@/hooks/useScope";
import { formatMoney } from "@/lib/ftg/format";
import {
  listMagicItems,
  removeMagicItem,
  subscribeCartDockOpen,
  subscribeMagicItems,
} from "@/lib/ftg/magic-cart";

/** Carrito accesible desde cualquier módulo: muestra lo pendiente y lleva a cobrar. */
export function CartDock() {
  const navigate = useNavigate();
  const { activeLocation } = useScope();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Permite abrir el carrito desde los avisos de otros módulos.
  useEffect(() => subscribeCartDockOpen(() => setOpen(true)), []);

  const items = useSyncExternalStore(
    subscribeMagicItems,
    () => JSON.stringify(listMagicItems()),
    () => "[]",
  );
  const parsed = mounted ? (JSON.parse(items) as ReturnType<typeof listMagicItems>) : [];

  const currency = activeLocation?.currency_code ?? "ARS";
  const locale = currency === "BRL" ? "pt-BR" : "es-AR";
  const total = parsed.reduce((acc, i) => acc + Number(i.price || 0), 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" className="relative h-9 gap-2 px-3" aria-label="Carrito de venta">
          <ShoppingCart className="h-[18px] w-[18px]" />
          <span className="hidden text-sm md:inline">Carrito</span>
          {parsed.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {parsed.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" /> Carrito de venta
          </SheetTitle>
          <SheetDescription>
            Ítems listos para cobrar en el punto de venta donde estés operando.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex-1 overflow-y-auto">
          {parsed.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Todavía no agregaste fotografías ni recuerdos IA.
            </p>
          ) : (
            <ul className="space-y-2">
              {parsed.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface p-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                      {!item.productId && <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />}
                      {item.label}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatMoney(Number(item.price), currency, locale)}
                      {item.photoCode ? ` · ${item.photoCode}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Quitar ${item.label}`}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    onClick={() => removeMagicItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Total estimado</span>
            <span>{formatMoney(total, currency, locale)}</span>
          </div>
          <Button
            className="mt-3 h-11 w-full"
            disabled={parsed.length === 0}
            onClick={() => {
              setOpen(false);
              void navigate({ to: "/pos", search: { cobrar: true } });
            }}
          >
            Ir a cobrar
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Los ítems pasan al punto de venta activo y se abre la pantalla de cobro.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}