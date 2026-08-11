export type AppRole =
  | "admin"
  | "management"
  | "executive"
  | "seller"
  | "superadmin"
  | "direccion"
  | "administracion"
  | "operaciones"
  | "encargado_sede"
  | "supervisor"
  | "cajero"
  | "fotografo"
  | "deposito"
  | "auditor";

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  management: "Gerencia",
  executive: "Ejecutivo",
  seller: "Vendedor",
  superadmin: "Superadministrador",
  direccion: "Dirección",
  administracion: "Administración",
  operaciones: "Responsable de operaciones",
  encargado_sede: "Encargado de sede",
  supervisor: "Supervisor",
  cajero: "Cajero / Vendedor",
  fotografo: "Fotógrafo",
  deposito: "Depósito",
  auditor: "Auditor",
};

export const ALL_ROLES = Object.keys(ROLE_LABELS) as AppRole[];

export type ModuleKey =
  | "inicio"
  | "pos"
  | "sedes"
  | "fotografias"
  | "operaciones"
  | "inventario"
  | "administracion"
  | "clientes"
  | "reportes"
  | "configuracion";

export const ALL_MODULES: ModuleKey[] = [
  "inicio",
  "pos",
  "sedes",
  "fotografias",
  "operaciones",
  "inventario",
  "administracion",
  "clientes",
  "reportes",
  "configuracion",
];

/** Permisos por módulo (Etapa 1). */
export const ROLE_MODULES: Record<AppRole, ModuleKey[] | "*"> = {
  // Etapa 1: los cinco roles nuevos acceden a todos los módulos operativos.
  admin: "*",
  management: "*",
  executive: "*",
  seller: "*",
  superadmin: "*",
  direccion: "*",
  administracion: ["inicio", "sedes", "administracion", "clientes", "reportes", "inventario", "configuracion"],
  operaciones: ["inicio", "sedes", "operaciones", "inventario", "reportes", "fotografias"],
  encargado_sede: ["inicio", "pos", "sedes", "fotografias", "operaciones", "inventario", "reportes"],
  supervisor: ["inicio", "pos", "sedes", "fotografias", "operaciones", "reportes"],
  cajero: ["inicio", "pos", "sedes", "fotografias"],
  fotografo: ["inicio", "fotografias"],
  deposito: ["inicio", "inventario"],
  auditor: ["inicio", "reportes", "administracion", "operaciones"],
};

export function modulesForRoles(roles: AppRole[]): Set<ModuleKey> {
  const result = new Set<ModuleKey>(["inicio"]);
  for (const role of roles) {
    const mods = ROLE_MODULES[role];
    if (mods === "*") return new Set<ModuleKey>(ALL_MODULES);
    mods.forEach((m) => result.add(m));
  }
  return result;
}
/** Roles principales de la plataforma (Etapa 1). */
export const CORE_ROLES: AppRole[] = ["admin", "management", "supervisor", "executive", "seller"];

/** Solo estos roles pueden crear usuarios, asignar roles y dar de baja. */
export const USER_ADMIN_ROLES: AppRole[] = ["admin", "superadmin"];

export function canManageUsers(roles: AppRole[]): boolean {
  return roles.some((r) => USER_ADMIN_ROLES.includes(r));
}
