import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Boxes, FileText, Receipt, ShoppingCart, Wallet } from "lucide-react";

import { SedeAccounting } from "@/components/ftg/SedeAccounting";

export const Route = createFileRoute("/_authenticated/administracion/reportes/")({
  component: ReportsIndex,
});

const REPORTS = [
  {
    to: "/administracion/reportes/ventas",
    icon: ShoppingCart,
    title: "Ventas",
    description: "Histórico de ventas por período y punto de venta, con medio de pago y estado.",
  },
  {
    to: "/administracion/reportes/cajas",
    icon: Wallet,
    title: "Cajas y arqueos",
    description: "Turnos de caja con montos esperados, contados y diferencias.",
  },
  {
    to: "/administracion/reportes/pagar",
    icon: FileText,
    title: "Cuentas a pagar",
    description: "Documentos a proveedores por período y estado, con importe y saldo.",
  },
  {
    to: "/administracion/reportes/cobrar",
    icon: FileText,
    title: "Cuentas a cobrar",
    description: "Documentos a clientes por período y estado, con importe y saldo.",
  },
  {
    to: "/administracion/reportes/comprobantes",
    icon: Receipt,
    title: "Facturas procesadas",
    description: "Comprobantes digitalizados por período y dirección, con estado de aprobación.",
  },
  {
    to: "/administracion/reportes/inventario",
    icon: Boxes,
    title: "Inventario y stock",
    description: "Movimientos de stock por período, sede y tipo de movimiento.",
  },
] as const;

function ReportsIndex() {
  return (
    <div className="space-y-6">
      <SedeAccounting />

      <section className="surface-card p-5">
        <h2 className="text-base font-semibold">Reportes disponibles</h2>
        <p className="text-sm text-muted-foreground">
          Cada reporte permite filtrar por período y sede, y exportar a CSV, PDF o Google Sheets.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {REPORTS.map((r) => (
            <Link
              key={r.to}
              to={r.to}
              className="group flex items-start gap-3 rounded-xl bg-surface p-4 transition hover:bg-accent/40"
            >
              <span className="rounded-lg bg-primary/10 p-2 text-primary">
                <r.icon className="h-4 w-4" />
              </span>
              <span className="flex-1">
                <span className="flex items-center gap-1 text-sm font-medium">
                  {r.title}
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{r.description}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
