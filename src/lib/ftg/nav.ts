export type SubNavItem = {
  to: string;
  label: string;
  exact?: boolean;
  search?: Record<string, string>;
  group?: string;
};

export const ADMIN_SUBNAV: SubNavItem[] = [
  { to: "/administracion", label: "Resumen", exact: true, group: "General" },
  { to: "/administracion/cobrar", label: "Ctas a Cobrar", group: "General" },
  { to: "/administracion/pagar", label: "Ctas a Pagar", group: "General" },
  { to: "/administracion/minutas", label: "Minutas", group: "General" },
  { to: "/administracion/asientos", label: "Asientos contables", group: "Contabilidad" },
  { to: "/administracion/plan-de-cuentas", label: "Plan de cuentas", group: "Contabilidad" },
  { to: "/administracion/reportes", label: "Reportes disponibles", exact: true, group: "Reportes" },
  { to: "/administracion/reportes/ventas", label: "Ventas", group: "Reportes" },
  { to: "/administracion/reportes/cajas", label: "Cajas y arqueos", group: "Reportes" },
  { to: "/administracion/reportes/pagar", label: "Ctas a pagar (histórico)", group: "Reportes" },
  { to: "/administracion/reportes/cobrar", label: "Ctas a cobrar (histórico)", group: "Reportes" },
  { to: "/administracion/reportes/comprobantes", label: "Facturas procesadas", group: "Reportes" },
  { to: "/administracion/reportes/inventario", label: "Inventario y stock", group: "Reportes" },
  { to: "/administracion/reportes/facturas", label: "Facturas automatizadas", group: "Reportes" },
  { to: "/administracion/eecc", label: "Sumas y saldos", exact: true, group: "EECC" },
  { to: "/administracion/eecc/resultados", label: "Estado de resultados", group: "EECC" },
  { to: "/administracion/eecc/situacion", label: "Situación patrimonial", group: "EECC" },
  { to: "/administracion/eecc/diario", label: "Libro diario", group: "EECC" },
  { to: "/administracion/eecc/mayor", label: "Libro mayor", group: "EECC" },
  { to: "/administracion/eecc/flujo-fondos", label: "Flujo de fondos", group: "EECC" },
  { to: "/administracion/eecc/conciliacion", label: "Conciliación de fondos", group: "EECC" },
];

export const SUPERVISOR_SUBNAV: SubNavItem[] = [
  { to: "/supervisores", label: "Resumen del parque", exact: true, group: "General" },
  { to: "/supervisores/operativo", label: "Control operativo", group: "Controles" },
  { to: "/supervisores/puntos-venta", label: "Control de puntos de venta", group: "Controles" },
  { to: "/supervisores/cajas", label: "Control de cajas", group: "Controles" },
  { to: "/supervisores/ventas", label: "Control de ventas", group: "Controles" },
  { to: "/supervisores/inventario", label: "Control de inventario", group: "Controles" },
  { to: "/supervisores/alertas", label: "Alertas e incidentes", group: "Seguimiento" },
  { to: "/supervisores/cierre", label: "Cierre diario", group: "Seguimiento" },
  { to: "/supervisores/predicciones", label: "Predicciones con IA", group: "Análisis" },
  { to: "/supervisores/reportes", label: "Reportes", group: "Análisis" },
];

export const POS_SUBNAV: SubNavItem[] = [
  { to: "/pos", label: "Vender y cobrar", exact: true },
  { to: "/pos/detalle", label: "Detalle de lo vendido" },
];

export const CONFIG_SUBNAV: SubNavItem[] = [
  { to: "/configuracion/usuarios", label: "Usuarios" },
  { to: "/configuracion/roles", label: "Roles y permisos" },
  { to: "/configuracion/empleados", label: "Empleados" },
  { to: "/configuracion/vacaciones", label: "Vacaciones y licencias" },
  { to: "/configuracion", label: "Empresas y países", search: { tab: "paises" }, exact: true },
  { to: "/configuracion", label: "Sedes y puntos de venta", search: { tab: "sedes" }, exact: true },
  { to: "/configuracion/parametros", label: "Parámetros administrativos" },
  { to: "/configuracion/auditoria", label: "Auditoría" },
  { to: "/configuracion/notificaciones", label: "Punto de venta", group: "Notificaciones" },
];

export const SECTION_SUBNAV: Record<string, SubNavItem[]> = {
  administracion: ADMIN_SUBNAV,
  supervisores: SUPERVISOR_SUBNAV,
  configuracion: CONFIG_SUBNAV,
  pos: POS_SUBNAV,
};

export function findSubNavItem(items: SubNavItem[], pathname: string, search?: Record<string, unknown>) {
  const matches = items.filter((item) => {
    if (item.exact) {
      if (pathname !== item.to) return false;
      if (item.search) {
        return Object.entries(item.search).every(([k, v]) => (search?.[k] as string | undefined) === v);
      }
      return true;
    }
    return pathname.startsWith(item.to);
  });
  return matches.sort((a, b) => b.to.length - a.to.length).at(0);
}
