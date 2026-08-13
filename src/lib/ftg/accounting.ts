export type ManualLine = {
  account_code: string;
  debit: string;
  credit: string;
  description: string;
};

export const ACCOUNT_TYPES = [
  { value: "activo", label: "Activo" },
  { value: "pasivo", label: "Pasivo" },
  { value: "patrimonio", label: "Patrimonio neto" },
  { value: "ingreso", label: "Ingresos" },
  { value: "egreso", label: "Egresos" },
  { value: "gasto", label: "Gastos" },
  { value: "costo", label: "Costos" },
];

export const NORMAL_SIDES = [
  { value: "debito", label: "Deudora (debe)" },
  { value: "credito", label: "Acreedora (haber)" },
];

export type FinanceDocCategory =
  | "proveedor"
  | "servicio"
  | "gasto"
  | "cliente_servicio"
  | "organismo_estatal"
  | "otro";

export const DOC_CATEGORY_LABEL: Record<FinanceDocCategory, string> = {
  proveedor: "Proveedores",
  servicio: "Servicios",
  gasto: "Gastos",
  cliente_servicio: "Cliente servicios",
  organismo_estatal: "Organismos estatales",
  otro: "Otros",
};

export const PAYABLE_CATEGORIES: FinanceDocCategory[] = [
  "proveedor",
  "servicio",
  "gasto",
  "organismo_estatal",
  "otro",
];
export const RECEIVABLE_CATEGORIES: FinanceDocCategory[] = ["cliente_servicio", "servicio", "otro"];

export type SupplierPartyKind = "proveedor" | "organismo_estatal" | "otro";

export const PARTY_KIND_LABEL: Record<SupplierPartyKind, string> = {
  proveedor: "Proveedor comercial",
  organismo_estatal: "Organismo estatal",
  otro: "Otro tercero",
};

export type MemoType = "nota_contable" | "movimiento_fondos";
export type MemoStatus = "pendiente" | "aprobada" | "conciliada" | "anulada";

export const MEMO_TYPE_LABEL: Record<MemoType, string> = {
  nota_contable: "Nota contable",
  movimiento_fondos: "Movimiento de fondos",
};

export const MEMO_STATUS_LABEL: Record<MemoStatus, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada · a postear",
  conciliada: "Conciliada",
  anulada: "Anulada",
};

export const MEMO_STATUS_TONE: Record<MemoStatus, string> = {
  pendiente: "bg-warning/15 text-warning",
  aprobada: "bg-primary/10 text-primary",
  conciliada: "bg-success/10 text-success",
  anulada: "bg-muted text-muted-foreground line-through",
};

/** Cuenta contable por defecto según el tipo de fondo de la caja. */
export function accountForFundKind(fundKind: string | null | undefined) {
  return fundKind === "efectivo" ? "1.1.1" : "1.1.2";
}

export function round2(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

/** Suma debe/haber de un borrador de asiento manual. */
export function totalsOf(lines: ManualLine[]) {
  const debit = round2(lines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0));
  const credit = round2(lines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0));
  return { debit, credit, balanced: debit > 0 && Math.abs(debit - credit) < 0.005 };
}
