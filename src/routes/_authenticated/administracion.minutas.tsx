import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";

import { StatCard } from "@/components/ftg/StatCard";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useScope } from "@/hooks/useScope";
import { supabase } from "@/integrations/supabase/client";
import { approveMemo, cancelMemo } from "@/lib/ftg/accounting.functions";
import {
  MEMO_STATUS_LABEL,
  MEMO_STATUS_TONE,
  MEMO_TYPE_LABEL,
  type MemoStatus,
  type MemoType,
} from "@/lib/ftg/accounting";
import { formatMoney } from "@/lib/ftg/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/administracion/minutas")({
  component: Minutas,
});

type Draft = {
  memo_type: MemoType;
  description: string;
  amount: string;
  cash_source_from_id: string;
  cash_source_to_id: string;
  debit_account_code: string;
  credit_account_code: string;
};

const EMPTY: Draft = {
  memo_type: "nota_contable",
  description: "",
  amount: "",
  cash_source_from_id: "",
  cash_source_to_id: "",
  debit_account_code: "",
  credit_account_code: "",
};

function Minutas() {
  const { activeLocation, activeLocationId } = useScope();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currency = activeLocation?.currency_code ?? "ARS";
  const approve = useServerFn(approveMemo);
  const cancel = useServerFn(cancelMemo);

  const [filter, setFilter] = useState<"todas" | MemoStatus>("todas");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["minutas", activeLocationId],
    queryFn: async () => {
      const [memos, sources, accounts, locations] = await Promise.all([
        supabase
          .from("treasury_memos")
          .select(
            "id, memo_type, description, amount, currency_code, status, location_id, organization_id, journal_entry_id, cash_source_from_id, cash_source_to_id, debit_account_code, credit_account_code, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(200),
        supabase.from("cash_sources").select("id, name, organization_id, location_id").eq("is_active", true).order("name"),
        supabase.from("ledger_accounts").select("code, name").eq("is_active", true).order("code"),
        supabase.from("locations").select("id, organization_id"),
      ]);
      if (memos.error) throw memos.error;
      return {
        memos: memos.data ?? [],
        sources: sources.data ?? [],
        accounts: accounts.data ?? [],
        locations: locations.data ?? [],
      };
    },
  });

  const memos = useMemo(
    () => (data?.memos ?? []).filter((m) => filter === "todas" || m.status === filter),
    [data?.memos, filter],
  );
  const sources = (data?.sources ?? []).filter((s) => !activeLocationId || !s.location_id || s.location_id === activeLocationId);
  const pending = (data?.memos ?? []).filter((m) => m.status === "pendiente");
  const pendingTotal = pending.reduce((acc, m) => acc + Number(m.amount), 0);

  const create = useMutation({
    mutationFn: async () => {
      const amount = Number(draft.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Importe inválido");
      if (draft.description.trim().length < 3) throw new Error("Describí la minuta");
      const organizationId =
        (data?.locations ?? []).find((l) => l.id === activeLocationId)?.organization_id ??
        (data?.sources ?? [])[0]?.organization_id;
      if (!organizationId) throw new Error("No se encontró la organización");
      if (draft.memo_type === "nota_contable" && (!draft.debit_account_code || !draft.credit_account_code)) {
        throw new Error("Elegí la cuenta del debe y la del haber");
      }
      if (draft.memo_type === "movimiento_fondos" && (!draft.cash_source_from_id || !draft.cash_source_to_id)) {
        throw new Error("Elegí la caja de origen y la de destino");
      }
      const { error } = await supabase.from("treasury_memos").insert({
        organization_id: organizationId,
        location_id: activeLocationId,
        memo_type: draft.memo_type,
        description: draft.description.trim(),
        amount,
        currency_code: currency,
        cash_source_from_id: draft.cash_source_from_id || null,
        cash_source_to_id: draft.cash_source_to_id || null,
        debit_account_code: draft.debit_account_code || null,
        credit_account_code: draft.credit_account_code || null,
        idempotency_key: crypto.randomUUID(),
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Minuta cargada");
      setOpen(false);
      setDraft(EMPTY);
      queryClient.invalidateQueries({ queryKey: ["minutas"] });
    },
    onError: (e: Error) => toast.error("No pudimos guardar la minuta", { description: e.message }),
  });

  async function runApprove(id: string) {
    setBusyId(id);
    try {
      await approve({ data: { memo_id: id, idempotency_key: `memo-${id}` } });
      toast.success("Minuta conciliada y posteada");
      await queryClient.invalidateQueries({ queryKey: ["minutas"] });
    } catch (e) {
      toast.error("No pudimos aprobar la minuta", { description: (e as Error).message });
    } finally {
      setBusyId(null);
    }
  }

  async function runCancel(id: string) {
    setBusyId(id);
    try {
      await cancel({ data: { memo_id: id } });
      toast.success("Minuta anulada");
      await queryClient.invalidateQueries({ queryKey: ["minutas"] });
    } catch (e) {
      toast.error("No pudimos anular la minuta", { description: (e as Error).message });
    } finally {
      setBusyId(null);
    }
  }

  const sourceName = (id: string | null) => (data?.sources ?? []).find((s) => s.id === id)?.name ?? "—";

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Minutas</h2>
          <p className="text-xs text-muted-foreground">
            Notas contables y movimientos internos de fondos pendientes de conciliación.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Nueva minuta
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Minutas pendientes" value={String(pending.length)} tone={pending.length > 0 ? "warning" : "success"} />
        <StatCard label="Importe pendiente" value={formatMoney(pendingTotal, currency)} />
        <StatCard label="Cargadas en total" value={String(data?.memos.length ?? 0)} />
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="pendiente">Pendientes</TabsTrigger>
          <TabsTrigger value="conciliada">Conciliadas</TabsTrigger>
          <TabsTrigger value="anulada">Anuladas</TabsTrigger>
        </TabsList>
      </Tabs>

      {error && (
        <p className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">
          No pudimos cargar las minutas: {(error as Error).message}
        </p>
      )}

      <div className="surface-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descripción</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Origen / destino</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" /> Cargando minutas…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && memos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No hay minutas para este filtro.
                </TableCell>
              </TableRow>
            )}
            {memos.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <p className="font-medium">{m.description}</p>
                  <p className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</p>
                </TableCell>
                <TableCell className="text-sm">{MEMO_TYPE_LABEL[m.memo_type as MemoType]}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {m.memo_type === "movimiento_fondos"
                    ? `${sourceName(m.cash_source_from_id)} → ${sourceName(m.cash_source_to_id)}`
                    : `${m.debit_account_code ?? "—"} / ${m.credit_account_code ?? "—"}`}
                </TableCell>
                <TableCell className="text-right font-medium">{formatMoney(Number(m.amount), m.currency_code)}</TableCell>
                <TableCell>
                  <span
                    className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", MEMO_STATUS_TONE[m.status as MemoStatus])}
                  >
                    {MEMO_STATUS_LABEL[m.status as MemoStatus]}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {m.status === "pendiente" ? (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mr-1.5"
                        disabled={busyId === m.id}
                        onClick={() => void runApprove(m.id)}
                      >
                        {busyId === m.id ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-1.5 h-4 w-4" />
                        )}
                        Aprobar y postear
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busyId === m.id} onClick={() => void runCancel(m.id)}>
                        <XCircle className="mr-1.5 h-4 w-4" /> Anular
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">{m.journal_entry_id ? "Asiento posteado" : "—"}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva minuta</DialogTitle>
            <DialogDescription>
              Se registra en la sede activa y en {currency}. Queda pendiente hasta que un perfil administrativo la apruebe.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tipo de minuta</Label>
              <Select value={draft.memo_type} onValueChange={(v) => setDraft((p) => ({ ...p, memo_type: v as MemoType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nota_contable">Nota contable</SelectItem>
                  <SelectItem value="movimiento_fondos">Movimiento de fondos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="memo-desc">Descripción</Label>
              <Input
                id="memo-desc"
                value={draft.description}
                onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="memo-amount">Importe</Label>
              <Input
                id="memo-amount"
                type="number"
                min="0"
                value={draft.amount}
                onChange={(e) => setDraft((p) => ({ ...p, amount: e.target.value }))}
              />
            </div>

            {draft.memo_type === "movimiento_fondos" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Caja origen</Label>
                  <Select
                    value={draft.cash_source_from_id}
                    onValueChange={(v) => setDraft((p) => ({ ...p, cash_source_from_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Elegí la caja" />
                    </SelectTrigger>
                    <SelectContent>
                      {sources.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Caja destino</Label>
                  <Select
                    value={draft.cash_source_to_id}
                    onValueChange={(v) => setDraft((p) => ({ ...p, cash_source_to_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Elegí la caja" />
                    </SelectTrigger>
                    <SelectContent>
                      {sources.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Cuenta del debe</Label>
                  <Select
                    value={draft.debit_account_code}
                    onValueChange={(v) => setDraft((p) => ({ ...p, debit_account_code: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Elegí una cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      {(data?.accounts ?? []).map((a) => (
                        <SelectItem key={a.code} value={a.code}>
                          {a.code} · {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Cuenta del haber</Label>
                  <Select
                    value={draft.credit_account_code}
                    onValueChange={(v) => setDraft((p) => ({ ...p, credit_account_code: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Elegí una cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      {(data?.accounts ?? []).map((a) => (
                        <SelectItem key={a.code} value={a.code}>
                          {a.code} · {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={create.isPending || !draft.description || !draft.amount} onClick={() => create.mutate()}>
              {create.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Guardar minuta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
