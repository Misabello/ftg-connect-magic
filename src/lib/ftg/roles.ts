export type AppRole =
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