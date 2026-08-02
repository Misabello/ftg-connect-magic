import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Camera, Percent, Receipt } from "lucide-react";

import { PageHeader } from "@/components/ftg/PageHeader";
import { StatCard } from "@/components/ftg/StatCard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/hooks/useI18n";
import { useScope } from "@/hooks/useScope";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, formatNumber } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes — FTG ONE" },
      { name: "description", content: "Ventas por día, categoría y medio de pago, con conversión fotográfica." },
      { property: "og:title", content: "Reportes — FTG ONE" },
      {
        property: "og:description",
        content: "Ventas por día, categoría y medio de pago, con conversión fotográfica.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reportes,
});

const RANGES = [
  { value: "7", label: "Últimos 7 días" },
  { value: "30", label: "Últimos 30 días" },
  { value: "90", label: "Últimos 90 días" },
];

function Reportes() {
  const { activeLocation, activeLocationId } = useScope();
  const { t } = useI18n();
  const [range, setRange] = useState("30");

  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - Number(range));
    return d.toISOString();
  }, [range]);

  const { data } = useQuery({
    queryKey: ["reportes", activeLocationId, range],
    enabled: !!activeLocationId,
    queryFn: async () => {
      const [sales, items, payments, photos, souvenirs, products] = await Promise.all([
        supabase
          .from("sales")
          .select("id, total, subtotal, tax_total, discount_total, currency_code, status, created_at")
          .eq("location_id", activeLocationId!)
          .gte("created_at", since),
        supabase.from("sale_items").select("sale_id, product_id, quantity, line_total, description"),
        supabase.from("sale_payments").select("sale_id, method_name, amount, currency_code"),
        supabase.from("photos").select("id, status, created_at").eq("location_id", activeLocationId!).gte("created_at", since),
        supabase.from("ai_souvenirs").select("id, status, estimated_cost, created_at").gte("created_at", since),
        supabase.from("products").select("id, name, kind"),
      ]);
      if (sales.error) throw sales.error;
      return {
        sales: sales.data ?? [],
        items: items.data ?? [],
        payments: payments.data ?? [],
        photos: photos.data ?? [],
        souvenirs: souvenirs.data ?? [],
        products: products.data ?? [],
      };
    },
  });

  const currency = activeLocation?.currency_code ?? "ARS";
  const sales = (data?.sales ?? []).filter((s) => s.status === "completada");
  const saleIds = new Set(sales.map((s) => s.id));
  const items = (data?.items ?? []).filter((i) => saleIds.has(i.sale_id));
  const payments = (data?.payments ?? []).filter((p) => saleIds.has(p.sale_id));
  const productKind = new Map((data?.products ?? []).map((p) => [p.id, p.kind]));

  const gross = sales.reduce((acc, s) => acc + Number(s.total), 0);
  const net = sales.reduce((acc, s) => acc + Number(s.subtotal) - Number(s.discount_total), 0);
  const taxes = sales.reduce((acc, s) => acc + Number(s.tax_total), 0);
  const ticket = sales.length ? gross / sales.length : 0;

  const photos = data?.photos ?? [];
  const soldPhotos = photos.filter((p) => p.status === "vendida").length;
  const conversion = photos.length ? (soldPhotos / photos.length) * 100 : 0;

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach((s) => {
      const key = s.created_at.slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + Number(s.total));
    });
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 10);
  }, [sales]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((i) => {
      const kind = (i.product_id && productKind.get(i.product_id)) || "otros";
      map.set(kind, (map.get(kind) ?? 0) + Number(i.line_total));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [items, productKind]);

  const byMethod = useMemo(() => {
    const map = new Map<string, number>();
    payments.forEach((p) => map.set(p.method_name, (map.get(p.method_name) ?? 0) + Number(p.amount)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [payments]);

  const maxDay = Math.max(1, ...byDay.map(([, v]) => v));
  const totalCategory = Math.max(1, byCategory.reduce((acc, [, v]) => acc + v, 0));
  const aiCost = (data?.souvenirs ?? []).reduce((acc, s) => acc + Number(s.estimated_cost ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.reportes.title")}
        description={t("page.reportes.desc")}
        actions={
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ventas brutas" value={formatMoney(gross, currency)} icon={Receipt} hint={`${sales.length} ventas`} />
        <StatCard label="Ventas netas" value={formatMoney(net, currency)} icon={BarChart3} hint={`Impuestos ${formatMoney(taxes, currency)}`} />
        <StatCard label="Ticket promedio" value={formatMoney(ticket, currency)} />
        <StatCard
          label="Conversión fotográfica"
          value={`${conversion.toFixed(1)}%`}
          icon={Percent}
          tone={conversion >= 30 ? "success" : "warning"}
          hint={`${soldPhotos} de ${photos.length} fotos vendidas`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface-card p-5">
          <h2 className="text-base font-semibold">Ventas por día</h2>
          <ul className="mt-4 space-y-3">
            {byDay.length === 0 && (
              <li className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No hay ventas en el período seleccionado.
              </li>
            )}
            {byDay.map(([day, value]) => (
              <li key={day} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{day}</span>
                  <span className="font-medium">{formatMoney(value, currency)}</span>
                </div>
                <Progress value={(value / maxDay) * 100} />
              </li>
            ))}
          </ul>
        </section>

        <section className="surface-card p-5">
          <h2 className="text-base font-semibold">Fotografía vs. merchandising</h2>
          <ul className="mt-4 space-y-3">
            {byCategory.length === 0 && (
              <li className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Sin líneas de venta en el período.
              </li>
            )}
            {byCategory.map(([kind, value]) => (
              <li key={kind} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize text-muted-foreground">{kind}</span>
                  <span className="font-medium">{formatMoney(value, currency)}</span>
                </div>
                <Progress value={(value / totalCategory) * 100} />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Costo estimado de recuerdos IA en el período: {formatMoney(aiCost, "USD")}
          </p>
        </section>
      </div>

      <section className="surface-card overflow-hidden">
        <header className="flex items-center justify-between gap-3 p-5">
          <h2 className="text-base font-semibold">Medios de pago</h2>
          <Badge variant="secondary" className="gap-1.5">
            <Camera className="h-3.5 w-3.5" /> {formatNumber(photos.length)} fotos capturadas
          </Badge>
        </header>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medio</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead className="text-right">Participación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {byMethod.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                  Sin cobros registrados en el período.
                </TableCell>
              </TableRow>
            )}
            {byMethod.map(([method, value]) => (
              <TableRow key={method}>
                <TableCell className="font-medium">{method}</TableCell>
                <TableCell className="text-right">{formatMoney(value, currency)}</TableCell>
                <TableCell className="text-right">{((value / Math.max(1, gross)) * 100).toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}