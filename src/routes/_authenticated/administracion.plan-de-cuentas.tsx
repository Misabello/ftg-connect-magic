import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { ExportMenu } from "@/components/ftg/admin/ExportMenu";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { ACCOUNT_TYPES, NORMAL_SIDES } from "@/lib/ftg/accounting";
import { ACCOUNT_TYPE_LABEL } from "@/lib/ftg/eecc";

export const Route = createFileRoute("/_authenticated/administracion/plan-de-cuentas")({
  component: PlanDeCuentas,
});

type Draft = {
  id: string | null;
  code: string;
  name: string;
  account_type: string;
  normal_side: string;
  sort_order: string;
  is_active: boolean;
};

const EMPTY: Draft = {
  id: null,
  code: "",
  name: "",
  account_type: "activo",
  normal_side: "debito",
  sort_order: "0",
  is_active: true,
};

function PlanDeCuentas() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("todas");
  const [statusFilter, setStatusFilter] = useState("todas");

  const { data, isLoading, error } = useQuery({
    queryKey: ["plan-de-cuentas"],
    queryFn: async () => {
      const [accounts, used] = await Promise.all([
        supabase
          .from("ledger_accounts")
          .select("id, code, name, account_type, normal_side, sort_order, is_active")
          .order("code"),
        supabase.from("journal_lines").select("account_id").limit(5000),
      ]);
      if (accounts.error) throw accounts.error;
      return {
        accounts: accounts.data ?? [],
        usedIds: new Set((used.data ?? []).map((l) => l.account_id)),
      };
    },
  });

  const accounts = data?.accounts ?? [];
  const visible = useMemo(
    () =>
      accounts.filter(
        (a) =>
          (search.trim() === "" ? true : `${a.code} ${a.name}`.toLowerCase().includes(search.toLowerCase())) &&
          (typeFilter === "todas" || a.account_type === typeFilter) &&
          (statusFilter === "todas" || (statusFilter === "activas" ? a.is_active : !a.is_active)),
      ),
    [accounts, search, typeFilter, statusFilter],
  );

  const save = useMutation({
    mutationFn: async () => {
      const code = draft.code.trim();
      const name = draft.name.trim();
      if (!code || !name) throw new Error("Código y nombre son obligatorios");
      const payload = {
        code,
        name,
        account_type: draft.account_type,
        normal_side: draft.normal_side,
        sort_order: Number(draft.sort_order) || 0,
        is_active: draft.is_active,
      };
      if (draft.id) {
        const { error } = await supabase.from("ledger_accounts").update(payload).eq("id", draft.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ledger_accounts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(draft.id ? "Cuenta actualizada" : "Cuenta creada");
      setOpen(false);
      setDraft(EMPTY);
      queryClient.invalidateQueries({ queryKey: ["plan-de-cuentas"] });
    },
    onError: (e: Error) =>
      toast.error("No pudimos guardar la cuenta", {
        description: e.message.includes("row-level")
          ? "Se requiere perfil administrativo o contable."
          : e.message,
      }),
  });

  const toggleActive = useMutation({
    mutationFn: async (account: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("ledger_accounts")
        .update({ is_active: !account.is_active })
        .eq("id", account.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Estado de la cuenta actualizado");
      queryClient.invalidateQueries({ queryKey: ["plan-de-cuentas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Plan de cuentas</h2>
          <p className="text-xs text-muted-foreground">
            Alta y edición de cuentas contables. Las cuentas con movimientos solo se dan de baja lógicamente.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código o nombre"
            className="max-w-xs"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las categorías</SelectItem>
              {ACCOUNT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos</SelectItem>
              <SelectItem value="activas">Activas</SelectItem>
              <SelectItem value="inactivas">Inactivas</SelectItem>
            </SelectContent>
          </Select>
          <ExportMenu
            filename="plan-de-cuentas"
            title="Plan de cuentas"
            subtitle={`${
              typeFilter === "todas"
                ? "Todas las categorías"
                : (ACCOUNT_TYPES.find((t) => t.value === typeFilter)?.label ?? typeFilter)
            } · ${statusFilter === "todas" ? "Activas e inactivas" : statusFilter === "activas" ? "Solo activas" : "Solo inactivas"}`}
            headers={["Código", "Nombre", "Tipo", "Saldo normal", "Movimientos", "Estado", "Orden"]}
            rightAlign={["Orden"]}
            disabled={isLoading}
            getRows={() =>
              visible.map((a) => ({
                Código: a.code,
                Nombre: a.name,
                Tipo: ACCOUNT_TYPE_LABEL[a.account_type] ?? a.account_type,
                "Saldo normal": a.normal_side === "credito" || a.normal_side === "credit" ? "Acreedora" : "Deudora",
                Movimientos: data?.usedIds.has(a.id) ? "Con movimientos" : "Sin movimientos",
                Estado: a.is_active ? "Activa" : "Inactiva",
                Orden: a.sort_order ?? 0,
              }))
            }
          />
          <Button
            onClick={() => {
              setDraft(EMPTY);
              setOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Nueva cuenta
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">
          No pudimos cargar el plan de cuentas: {(error as Error).message}
        </p>
      )}

      <div className="surface-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Saldo normal</TableHead>
              <TableHead>Movimientos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" /> Cargando cuentas…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  No hay cuentas para este filtro.
                </TableCell>
              </TableRow>
            )}
            {visible.map((a) => {
              const hasMovements = data?.usedIds.has(a.id) ?? false;
              return (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.code}</TableCell>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-sm">{ACCOUNT_TYPE_LABEL[a.account_type] ?? a.account_type}</TableCell>
                  <TableCell className="text-sm">
                    {a.normal_side === "credito" || a.normal_side === "credit" ? "Acreedora" : "Deudora"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{hasMovements ? "Con movimientos" : "Sin movimientos"}</TableCell>
                  <TableCell>
                    <Badge variant={a.is_active ? "default" : "secondary"}>{a.is_active ? "Activa" : "Inactiva"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDraft({
                          id: a.id,
                          code: a.code,
                          name: a.name,
                          account_type: a.account_type,
                          normal_side: a.normal_side,
                          sort_order: String(a.sort_order ?? 0),
                          is_active: a.is_active,
                        });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="mr-1.5 h-4 w-4" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={toggleActive.isPending}
                      onClick={() => toggleActive.mutate({ id: a.id, is_active: a.is_active })}
                    >
                      {a.is_active ? "Dar de baja" : "Reactivar"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.id ? "Editar cuenta" : "Nueva cuenta"}</DialogTitle>
            <DialogDescription>
              El código define la jerarquía (por ejemplo 1.1.1). La baja siempre es lógica: nunca se borra una cuenta con
              movimientos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="code">Código</Label>
                <Input id="code" value={draft.code} onChange={(e) => setDraft((p) => ({ ...p, code: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acc-name">Nombre</Label>
                <Input id="acc-name" value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={draft.account_type} onValueChange={(v) => setDraft((p) => ({ ...p, account_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Saldo normal</Label>
                <Select value={draft.normal_side} onValueChange={(v) => setDraft((p) => ({ ...p, normal_side: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NORMAL_SIDES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sort">Orden</Label>
                <Input
                  id="sort"
                  type="number"
                  value={draft.sort_order}
                  onChange={(e) => setDraft((p) => ({ ...p, sort_order: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  id="active"
                  checked={draft.is_active}
                  onCheckedChange={(v) => setDraft((p) => ({ ...p, is_active: v }))}
                />
                <Label htmlFor="active">Cuenta activa</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={save.isPending || !draft.code || !draft.name} onClick={() => save.mutate()}>
              {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
