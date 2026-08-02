import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CloudUpload, Receipt, RefreshCw, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/ftg/PageHeader";
import { CartPanel } from "@/components/ftg/pos/CartPanel";
import { CashSessionCard, type CashSession } from "@/components/ftg/pos/CashSessionCard";
import { CatalogPanel } from "@/components/ftg/pos/CatalogPanel";
import {
  CheckoutDialog,
  type CheckoutCustomer,
  type PaymentDraft,
  type PaymentMethodRow,
} from "@/components/ftg/pos/CheckoutDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { useScope } from "@/hooks/useScope";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/ftg/format";
import { enqueueSale } from "@/lib/ftg/offline";
import {
  buildSaleNumber,
  computeTotals,
  lineGross,
  lineTax,
  newIdempotencyKey,
  type CartLine,
  type CatalogProduct,
} from "@/lib/ftg/pos";

export const Route = createFileRoute("/_authenticated/pos")({
  head: () => ({
    meta: [
      { title: "Punto de venta — FTG ONE" },
      { name: "description", content: "Punto de venta de Fotográfica: catálogo, carrito, pagos y caja." },
      { property: "og:title", content: "Punto de venta — FTG ONE" },
      { property: "og:description", content: "Catálogo, carrito, medios de pago combinados y arqueo de caja." },
    ],
  }),
  component: Pos,
});

function Pos() {
  const { activeLocation, activeLocationId, online } = useScope();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { pending, pendingCount, syncing, sync } = useOfflineQueue();

  const [selectedPosId, setSelectedPosId] = useState<string | null>(null);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const currency = activeLocation?.currency_code ?? "ARS";
  const locale = activeLocation?.country_code === "BR" ? "pt-BR" : "es-AR";

  const { data: posList = [] } = useQuery({
    queryKey: ["pos-list", activeLocationId],
    enabled: !!activeLocationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("points_of_sale")
        .select("id, code, name, currency_code, event_id, organization_id")
        .eq("location_id", activeLocationId!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const activePos = posList.find((p) => p.id === selectedPosId) ?? posList[0] ?? null;

  const { data: catalog, isLoading: catalogLoading } = useQuery({
    queryKey: ["catalog", currency],
    queryFn: async () => {
      const [categoriesRes, productsRes, listRes] = await Promise.all([
        supabase.from("product_categories").select("id, code, name, sort_order").eq("is_active", true).order("sort_order"),
        supabase
          .from("products")
          .select("id, sku, barcode, name, description, kind, tax_rate, requires_photo, category_id")
          .eq("is_active", true)
          .is("deleted_at", null)
          .order("name"),
        supabase.from("price_lists").select("id, currency_code").eq("currency_code", currency).eq("is_active", true).limit(1),
      ]);
      if (productsRes.error) throw productsRes.error;
      const priceListId = listRes.data?.[0]?.id ?? null;
      const pricesRes = priceListId
        ? await supabase.from("product_prices").select("product_id, price, includes_tax").eq("price_list_id", priceListId)
        : { data: [] as { product_id: string; price: number; includes_tax: boolean }[] };
      const priceMap = new Map((pricesRes.data ?? []).map((p) => [p.product_id, p]));
      const products: CatalogProduct[] = (productsRes.data ?? [])
        .map((p) => {
          const price = priceMap.get(p.id);
          return {
            ...p,
            price: Number(price?.price ?? 0),
            includes_tax: price?.includes_tax ?? true,
            tax_rate: Number(p.tax_rate),
          };
        })
        .filter((p) => p.price > 0);
      return { categories: categoriesRes.data ?? [], products };
    },
  });

  const { data: methods = [] } = useQuery({
    queryKey: ["payment-methods", activeLocation?.country_code],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("id, code, name, kind, requires_reference, country_code, sort_order")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).filter(
        (m) => !m.country_code || m.country_code === activeLocation?.country_code,
      ) as PaymentMethodRow[];
    },
  });

  const { data: session = null } = useQuery({
    queryKey: ["cash-session", activePos?.id],
    enabled: !!activePos,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_sessions")
        .select("id, opened_at, opening_amount, status, currency_code")
        .eq("point_of_sale_id", activePos!.id)
        .eq("status", "abierta")
        .maybeSingle();
      if (error) throw error;
      return (data as CashSession | null) ?? null;
    },
  });

  const { data: sessionSales = [] } = useQuery({
    queryKey: ["session-sales", session?.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("id, sale_number, total, status, created_at, customer_name, sale_payments(amount, method_name, payment_method_id)")
        .eq("cash_session_id", session!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const cashMethodIds = useMemo(
    () => new Set(methods.filter((m) => m.kind === "efectivo").map((m) => m.id)),
    [methods],
  );

  const expectedCash = useMemo(() => {
    const opening = Number(session?.opening_amount ?? 0);
    const cash = sessionSales
      .filter((s) => s.status === "completada")
      .flatMap((s) => s.sale_payments ?? [])
      .filter((p) => p.payment_method_id && cashMethodIds.has(p.payment_method_id))
      .reduce((acc, p) => acc + Number(p.amount), 0);
    return Math.round((opening + cash) * 100) / 100;
  }, [session, sessionSales, cashMethodIds]);

  const products = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (catalog?.products ?? []).filter((p) => {
      if (category && p.category_id !== category) return false;
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        (p.barcode ?? "").toLowerCase().includes(term)
      );
    });
  }, [catalog, search, category]);

  const totals = computeTotals(lines);

  const addProduct = (product: CatalogProduct) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) => (l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          unitPrice: product.price,
          quantity: 1,
          discountAmount: 0,
          taxRate: product.tax_rate,
          includesTax: product.includes_tax,
          requiresPhoto: product.requires_photo,
          photoCode: null,
        },
      ];
    });
  };

  const openSession = useMutation({
    mutationFn: async (amount: number) => {
      if (!activePos || !activeLocationId) throw new Error("Seleccioná un punto de venta");
      const { error } = await supabase.from("cash_sessions").insert({
        organization_id: activePos.organization_id,
        location_id: activeLocationId,
        point_of_sale_id: activePos.id,
        currency_code: activePos.currency_code,
        opening_amount: amount,
        opened_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Caja abierta");
      queryClient.invalidateQueries({ queryKey: ["cash-session"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const closeSession = useMutation({
    mutationFn: async ({ counted, notes }: { counted: number; notes: string }) => {
      if (!session) throw new Error("No hay caja abierta");
      const { error } = await supabase
        .from("cash_sessions")
        .update({
          status: "cerrada",
          closed_at: new Date().toISOString(),
          closed_by: user?.id ?? null,
          expected_amount: expectedCash,
          counted_amount: counted,
          difference_amount: Math.round((counted - expectedCash) * 100) / 100,
          notes: notes || null,
        })
        .eq("id", session.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Caja cerrada con arqueo registrado");
      queryClient.invalidateQueries({ queryKey: ["cash-session"] });
      queryClient.invalidateQueries({ queryKey: ["session-sales"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const registerSale = useMutation({
    mutationFn: async ({
      payments,
      customer,
    }: {
      payments: PaymentDraft[];
      customer: CheckoutCustomer;
    }) => {
      if (!activePos || !activeLocationId || !session) throw new Error("Abrí la caja antes de vender");
      const { count } = await supabase
        .from("sales")
        .select("id", { count: "exact", head: true })
        .eq("point_of_sale_id", activePos.id);
      const saleNumber = buildSaleNumber(activePos.code, (count ?? 0) + 1);

      const { data: sale, error } = await supabase
        .from("sales")
        .insert({
          organization_id: activePos.organization_id,
          location_id: activeLocationId,
          point_of_sale_id: activePos.id,
          event_id: activePos.event_id,
          cash_session_id: session.id,
          sale_number: saleNumber,
          sold_by: user?.id ?? null,
          customer_name: customer.name || null,
          customer_tax_id: customer.taxId || null,
          customer_email: customer.email || null,
          currency_code: currency,
          subtotal: totals.subtotal,
          discount_total: totals.discountTotal,
          tax_total: totals.taxTotal,
          total: totals.total,
          source: online ? "online" : "offline",
          idempotency_key: newIdempotencyKey(),
        })
        .select("id, sale_number")
        .single();
      if (error) throw error;

      const { error: itemsError } = await supabase.from("sale_items").insert(
        lines.map((line) => ({
          sale_id: sale.id,
          product_id: line.productId,
          description: line.name,
          quantity: line.quantity,
          unit_price: line.unitPrice,
          discount_amount: line.discountAmount,
          tax_rate: line.taxRate,
          tax_amount: lineTax(line),
          line_total: lineGross(line),
          photo_code: line.photoCode,
        })),
      );
      if (itemsError) throw itemsError;

      const { error: paymentsError } = await supabase.from("sale_payments").insert(
        payments.map((p) => ({
          sale_id: sale.id,
          payment_method_id: p.methodId,
          method_name: methods.find((m) => m.id === p.methodId)?.name ?? "Sin especificar",
          amount: p.amount,
          currency_code: currency,
          reference: p.reference || null,
        })),
      );
      if (paymentsError) throw paymentsError;

      await supabase.from("audit_logs").insert({
        organization_id: activePos.organization_id,
        location_id: activeLocationId,
        user_id: user?.id ?? null,
        action: "venta_registrada",
        entity: "sales",
        entity_id: sale.id,
        details: { sale_number: sale.sale_number, total: totals.total, currency },
      });

      return sale;
    },
    onSuccess: (sale) => {
      toast.success(`Venta ${sale.sale_number} registrada`, {
        description: formatMoney(totals.total, currency, locale),
      });
      setLines([]);
      setCheckoutOpen(false);
      queryClient.invalidateQueries({ queryKey: ["session-sales"] });
    },
    onError: (error: Error) => toast.error("No se pudo registrar la venta", { description: error.message }),
  });

  const missingPhotoCode = lines.some((l) => l.requiresPhoto && !l.photoCode?.trim());
  const checkoutHint = !session
    ? "Abrí la caja para poder cobrar."
    : missingPhotoCode
      ? "Completá el código de foto en los productos que lo requieren."
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Punto de venta"
        description="Catálogo, carrito, pagos combinados y arqueo de caja por puesto."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!online && (
              <Badge variant="secondary" className="gap-1.5 text-warning">
                <WifiOff className="h-3.5 w-3.5" /> Sin conexión
              </Badge>
            )}
            <Select value={activePos?.id ?? ""} onValueChange={setSelectedPosId}>
              <SelectTrigger className="w-[16rem]">
                <SelectValue placeholder="Seleccionar punto de venta" />
              </SelectTrigger>
              <SelectContent>
                {posList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {posList.length === 0 ? (
        <p className="surface-card p-8 text-center text-sm text-muted-foreground">
          Esta sede todavía no tiene puntos de venta activos. Creálos desde Configuración.
        </p>
      ) : (
        <>
          <CashSessionCard
            session={session}
            currency={currency}
            locale={locale}
            expectedAmount={expectedCash}
            salesCount={sessionSales.filter((s) => s.status === "completada").length}
            disabled={!activePos}
            busy={openSession.isPending || closeSession.isPending}
            onOpen={(amount) => openSession.mutate(amount)}
            onClose={(counted, notes) => closeSession.mutate({ counted, notes })}
          />

          <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <CatalogPanel
              products={products}
              categories={catalog?.categories ?? []}
              loading={catalogLoading}
              currency={currency}
              locale={locale}
              search={search}
              onSearchChange={setSearch}
              activeCategory={category}
              onCategoryChange={setCategory}
              onSelect={addProduct}
              disabled={!session}
            />

            <CartPanel
              lines={lines}
              currency={currency}
              locale={locale}
              onQuantity={(productId, delta) =>
                setLines((prev) =>
                  prev
                    .map((l) => (l.productId === productId ? { ...l, quantity: l.quantity + delta } : l))
                    .filter((l) => l.quantity > 0),
                )
              }
              onRemove={(productId) => setLines((prev) => prev.filter((l) => l.productId !== productId))}
              onPhotoCode={(productId, code) =>
                setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, photoCode: code } : l)))
              }
              onDiscount={(productId, amount) =>
                setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, discountAmount: amount } : l)))
              }
              onClear={() => setLines([])}
              onCheckout={() => setCheckoutOpen(true)}
              canCheckout={lines.length > 0 && !!session && !missingPhotoCode}
              checkoutHint={checkoutHint}
            />
          </div>

          <section className="surface-card p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Receipt className="h-4 w-4 text-primary" /> Ventas del turno
            </h2>
            <ul className="mt-4 space-y-2">
              {sessionSales.length === 0 && (
                <li className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Todavía no hay ventas registradas en este turno.
                </li>
              )}
              {sessionSales.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface p-4">
                  <div>
                    <p className="text-sm font-medium">{s.sale_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.customer_name ?? "Consumidor final"} ·{" "}
                      {(s.sale_payments ?? []).map((p) => p.method_name).join(" + ")}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{formatMoney(Number(s.total), currency, locale)}</p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        total={totals.total}
        currency={currency}
        locale={locale}
        methods={methods}
        submitting={registerSale.isPending}
        onConfirm={(payments, customer) => registerSale.mutate({ payments, customer })}
      />
    </div>
  );
}