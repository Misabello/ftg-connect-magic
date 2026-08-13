import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { StatCard } from "@/components/ftg/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useScope } from "@/hooks/useScope";
import { supabase } from "@/integrations/supabase/client";
import { postManualEntry } from "@/lib/ftg/accounting.functions";
import { totalsOf, type ManualLine } from "@/lib/ftg/accounting";
import { formatMoney } from "@/lib/ftg/format";

export const Route = createFileRoute("/_authenticated/administracion/asientos/nuevo")({
  component: NuevoAsiento,
});

const EMPTY_LINE: ManualLine = { account_code: "", debit: "", credit: "", description: "" };

function NuevoAsiento() {
  const navigate = useNavigate();
  const { activeLocation, activeLocationId } = useScope();
  const currency = activeLocation?.currency_code ?? "ARS";
  const post = useServerFn(postManualEntry);

  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [posId, setPosId] = useState<string>("");
  const [lines, setLines] = useState<ManualLine[]>([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const { data, isLoading } = useQuery({
    queryKey: ["asiento-manual-catalogo", activeLocationId],
    queryFn: async () => {
      const [accounts, pos] = await Promise.all([
        supabase.from("ledger_accounts").select("id, code, name, is_active").eq("is_active", true).order("code"),
        supabase.from("points_of_sale").select("id, name, location_id").order("name"),
      ]);
      if (accounts.error) throw accounts.error;
      return { accounts: accounts.data ?? [], pos: pos.data ?? [] };
    },
  });

  const accounts = data?.accounts ?? [];
  const posOptions = (data?.pos ?? []).filter((p) => !activeLocationId || p.location_id === activeLocationId);
  const totals = useMemo(() => totalsOf(lines), [lines]);
  const filled = lines.filter((l) => l.account_code && (Number(l.debit) > 0 || Number(l.credit) > 0));
  const canSave = totals.balanced && filled.length >= 2 && description.trim().length >= 3;

  const setLine = (index: number, patch: Partial<ManualLine>) =>
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const save = useMutation({
    mutationFn: async () =>
      post({
        data: {
          idempotency_key: idempotencyKey,
          entry_date: entryDate,
          description: description.trim(),
          location_id: activeLocationId,
          point_of_sale_id: posId || null,
          currency_code: currency,
          source_type: "manual",
          lines: filled.map((l) => ({
            account_code: l.account_code,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            description: l.description.trim() || null,
          })),
        },
      }),
    onSuccess: (result) => {
      toast.success(result.duplicated ? "El asiento ya estaba registrado" : "Asiento registrado", {
        description: `Debe ${formatMoney(result.debit, currency)} · Haber ${formatMoney(result.credit, currency)}`,
      });
      setDescription("");
      setLines([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
      setIdempotencyKey(crypto.randomUUID());
      void navigate({ to: "/administracion/eecc/diario" });
    },
    onError: (e: Error) => toast.error("No pudimos registrar el asiento", { description: e.message }),
  });

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">Cargar asiento manual</h2>
        <p className="text-xs text-muted-foreground">
          El asiento se registra con partida doble validada en el servidor y queda marcado como manual en el libro diario.
        </p>
      </div>

      <div className="surface-card space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="fecha">Fecha</Label>
            <Input id="fecha" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="desc">Descripción</Label>
            <Input
              id="desc"
              value={description}
              placeholder="Concepto del asiento"
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Punto de venta (opcional)</Label>
            <Select value={posId || "none"} onValueChange={(v) => setPosId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sin punto de venta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin punto de venta</SelectItem>
                {posOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Sede: {activeLocation?.name ?? "Todas"} · Moneda: {currency}
        </p>
      </div>

      <div className="surface-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[220px]">Cuenta</TableHead>
              <TableHead>Detalle</TableHead>
              <TableHead className="w-36 text-right">Debe</TableHead>
              <TableHead className="w-36 text-right">Haber</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" /> Cargando plan de cuentas…
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              lines.map((line, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Select value={line.account_code} onValueChange={(v) => setLine(index, { account_code: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Elegí una cuenta" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.code}>
                            {a.code} · {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={line.description}
                      placeholder="Detalle de la línea"
                      onChange={(e) => setLine(index, { description: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      className="text-right"
                      value={line.debit}
                      onChange={(e) => setLine(index, { debit: e.target.value, credit: e.target.value ? "" : line.credit })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      className="text-right"
                      value={line.credit}
                      onChange={(e) => setLine(index, { credit: e.target.value, debit: e.target.value ? "" : line.debit })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Quitar línea"
                      disabled={lines.length <= 2}
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <div className="border-t border-border p-3">
          <Button variant="outline" size="sm" onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])}>
            <Plus className="mr-1.5 h-4 w-4" /> Agregar línea
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total debe" value={formatMoney(totals.debit, currency)} />
        <StatCard label="Total haber" value={formatMoney(totals.credit, currency)} />
        <StatCard
          label="Diferencia"
          value={formatMoney(Math.abs(totals.debit - totals.credit), currency)}
          tone={totals.balanced ? "success" : "danger"}
          hint={totals.balanced ? "Asiento balanceado" : "Debe y haber deben coincidir"}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => void navigate({ to: "/administracion/eecc/diario" })}>
          Cancelar
        </Button>
        <Button disabled={!canSave || save.isPending} onClick={() => save.mutate()}>
          {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          Guardar asiento
        </Button>
      </div>
    </section>
  );
}
