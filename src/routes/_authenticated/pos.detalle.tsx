import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/ftg/PageHeader";
import { StatCard } from "@/components/ftg/StatCard";
import { ExportSheetButton } from "@/components/ftg/admin/ReportShell";
import { ExportMenu } from "@/components/ftg/admin/ExportMenu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useScope } from "@/hooks/useScope";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/pos/detalle")({
  head: () => ({
    meta: [
      { title: "Detalle de lo vendido — FTG ONE" },
      { name: "description", content: "Artículos vendidos por punto de venta y período, con exportación a Sheets." },
      { property: "og:title", content: "Detalle de lo vendido — FTG ONE" },
      { property: "og:description", content: "Resumen semanal de ventas por puesto con detalle de artículos." },
    ],
  }),
  component: PosDetalle,
});

const HEADERS = ["Fecha", "Venta", "Artículo", "Cantidad", "Precio", "Total", "Medios de pago"];
const isoDay = (offsetDays: number) => new Date(Date.now() - offsetDays * 86_400_000).toISOString().slice(0, 10);

function PosDetalle() {
  const { locations, activeLocationId } = useScope();
  const [locationId, setLocationId] = useState<string>(activeLocationId ?? "all");
  const [posId, setPosId] = useState<string>("");
  const [from, setFrom] = useState(() => isoDay(7));
  const [to, setTo] = useState(() => isoDay(0));

  const { data: posList = [] } = useQuery({
    queryKey: ["pos-detalle-list", locationId],
    queryFn: async () => {
      let query = supabase
        .from("points_of_sale")
        .select("id, code, name, location_id, currency_code")
        .eq("is_active", true)
        .order("name");
      if (locationId !== "all") query = query.eq("location_id", locationId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const activePos = posList.find((p) => p.id === posId) ?? null;
  const currency = activePos?.currency_code ?? "ARS";

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["pos-detalle-sales", posId, from, to],
    enabled: !!posId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select(
          "id, sale_number, created_at, total, status, customer_name, sale_items(description, quantity, unit_price, line_total), sale_payments(method_name, amount)",
        )
        .eq("point_of_sale_id", posId)
        .gte("created_at", `${from}T00:00:00`)
        .lte("created_at", `${to}T23:59:59`)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []).filter((s) => s.status === "completada");
    },
  });

  const rows = useMemo(
    () =>
      sales.flatMap((sale) =>
        (sale.sale_items ?? []).map((item) => ({
          Fecha: new Date(sale.created_at).toLocaleDateString("es-AR"),
          Venta: sale.sale_number,
          Artículo: item.description ?? "Sin detalle",
          Cantidad: Number(item.quantity ?? 0),
          Precio: Number(item.unit_price ?? 0),
          Total: Number(item.line_total ?? 0),
          "Medios de pago": (sale.sale_payments ?? []).map((p) => p.method_name).join(" + "),
        })),
      ),
    [sales],
  );

  const totals = useMemo(() => {
    const amount = rows.reduce((acc, r) => acc + r.Total, 0);
    const units = rows.reduce((acc, r) => acc + r.Cantidad, 0);
    return { amount, units, sales: sales.length };
  }, [rows, sales]);

  const subtitle = activePos
    ? `${activePos.name} · ${from} a ${to}`
    : "Elegí un punto de venta para ver el detalle";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Detalle de lo vendido"
        description="Seleccioná el punto de venta y el período para ver los artículos vendidos."
      />

      <div className="surface-card flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Sede</Label>
          <Select
            value={locationId}
            onValueChange={(v) => {
              setLocationId(v);
              setPosId("");
            }}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Sede" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sedes</SelectItem>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Punto de venta</Label>
          <Select value={posId} onValueChange={setPosId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Seleccionar punto de venta" />
            </SelectTrigger>
            <SelectContent>
              {posList.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} · {p.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Desde</Label>
          <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Hasta</Label>
          <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ExportMenu
            filename={`ftg-ventas-${activePos?.code ?? "pos"}-${from}_${to}`}
            title="Detalle de lo vendido"
            subtitle={subtitle}
            headers={HEADERS}
            rows={rows}
            rightAlign={["Cantidad", "Precio", "Total"]}
          />
          <ExportSheetButton title={`Detalle de lo vendido · ${subtitle}`} headers={HEADERS} getRows={() => rows} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Ventas" value={String(totals.sales)} hint={subtitle} />
        <StatCard label="Unidades vendidas" value={String(totals.units)} />
        <StatCard label="Total vendido" value={formatMoney(totals.amount, currency)} />
      </div>

      <div className="surface-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {HEADERS.map((h) => (
                <TableHead key={h} className={["Cantidad", "Precio", "Total"].includes(h) ? "text-right" : undefined}>
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {!posId && (
              <TableRow>
                <TableCell colSpan={HEADERS.length} className="py-10 text-center text-sm text-muted-foreground">
                  Elegí un punto de venta para ver los artículos vendidos.
                </TableCell>
              </TableRow>
            )}
            {posId && isLoading && (
              <TableRow>
                <TableCell colSpan={HEADERS.length} className="py-10 text-center text-sm text-muted-foreground">
                  Cargando ventas…
                </TableCell>
              </TableRow>
            )}
            {posId && !isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={HEADERS.length} className="py-10 text-center text-sm text-muted-foreground">
                  No hay ventas para este punto de venta en el período seleccionado.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r, index) => (
              <TableRow key={`${r.Venta}-${r.Artículo}-${index}`}>
                <TableCell>{r.Fecha}</TableCell>
                <TableCell className="font-medium">{r.Venta}</TableCell>
                <TableCell>{r.Artículo}</TableCell>
                <TableCell className="text-right">{r.Cantidad}</TableCell>
                <TableCell className="text-right">{formatMoney(r.Precio, currency)}</TableCell>
                <TableCell className="text-right">{formatMoney(r.Total, currency)}</TableCell>
                <TableCell>{r["Medios de pago"]}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}