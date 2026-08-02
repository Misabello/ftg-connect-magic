import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/ftg/format";
import type { CatalogProduct } from "@/lib/ftg/pos";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; code: string };

export function CatalogPanel({
  products,
  categories,
  loading,
  currency,
  locale,
  search,
  onSearchChange,
  activeCategory,
  onCategoryChange,
  onSelect,
  disabled,
}: {
  products: CatalogProduct[];
  categories: Category[];
  loading: boolean;
  currency: string;
  locale: string;
  search: string;
  onSearchChange: (value: string) => void;
  activeCategory: string | null;
  onCategoryChange: (value: string | null) => void;
  onSelect: (product: CatalogProduct) => void;
  disabled: boolean;
}) {
  return (
    <section className="surface-card flex min-h-0 flex-col p-5">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nombre, SKU o código de barras"
          className="pl-9"
          aria-label="Buscar producto"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onCategoryChange(null)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            activeCategory === null
              ? "bg-primary text-primary-foreground"
              : "bg-surface text-muted-foreground hover:text-foreground",
          )}
        >
          Todo
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onCategoryChange(c.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              activeCategory === c.id
                ? "bg-primary text-primary-foreground"
                : "bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      <ScrollArea className="mt-4 -mr-2 h-[26rem] pr-2">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No hay productos que coincidan con la búsqueda.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(p)}
                className="group flex flex-col items-start gap-1 rounded-2xl bg-surface p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <p className="text-sm font-medium">{p.name}</p>
                  {p.requires_photo && (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      Foto
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{p.sku}</p>
                <p className="mt-2 text-lg font-semibold text-primary">
                  {formatMoney(p.price, currency, locale)}
                </p>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </section>
  );
}