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
  | "supervisores"
  | "inventario"
  | "administracion"
  | "clientes"
  | "proveedores"
  | "reportes"
  | "configuracion";

export const ALL_MODULES: ModuleKey[] = [
  "inicio",
  "pos",
  "sedes",
  "fotografias",
  "operaciones",
  "supervisores",
  "inventario",
  "administracion",
  "clientes",
  "proveedores",
  "reportes",
  "configuracion",
];

/** Permisos por módulo. */
export const ROLE_MODULES: Record<AppRole, ModuleKey[] | "*"> = {
  admin: "*",
  management: [
    "inicio",
    "pos",
    "sedes",
    "fotografias",
    "operaciones",
    "supervisores",
    "inventario",
    "administracion",
    "clientes",
    "proveedores",
    "reportes",
  ],
  supervisor: [
    "inicio",
    "pos",
    "sedes",
    "fotografias",
    "operaciones",
    "supervisores",
    "inventario",
    "reportes",
  ],
  executive: ["inicio", "pos", "fotografias"],
  seller: ["inicio", "pos", "fotografias", "sedes"],
  superadmin: "*",
  direccion: "*",
  administracion: ["inicio", "sedes", "administracion", "clientes", "proveedores", "reportes", "inventario", "configuracion"],
  operaciones: ["inicio", "sedes", "operaciones", "supervisores", "inventario", "reportes", "fotografias"],
  encargado_sede: ["inicio", "pos", "sedes", "fotografias", "operaciones", "supervisores", "inventario", "reportes"],
  cajero: ["inicio", "pos", "sedes", "fotografias"],
  fotografo: ["inicio", "fotografias"],
  deposito: ["inicio", "inventario"],
  auditor: ["inicio", "reportes", "administracion", "operaciones", "supervisores"],
};

export function modulesForRoles(roles: AppRole[]): Set<ModuleKey> {
  // Acceso abierto temporal: todos los usuarios autenticados ven todos los módulos.
  void roles;
  return new Set<ModuleKey>(ALL_MODULES);
}

/** Prefijo de ruta → módulo, del más específico al más general. */
const MODULE_PATHS: { prefix: string; module: ModuleKey }[] = [
  { prefix: "/inicio", module: "inicio" },
  { prefix: "/pos", module: "pos" },
  { prefix: "/sedes", module: "sedes" },
  { prefix: "/fotografias", module: "fotografias" },
  { prefix: "/operaciones", module: "operaciones" },
  { prefix: "/supervisores", module: "supervisores" },
  { prefix: "/inventario", module: "inventario" },
  { prefix: "/administracion", module: "administracion" },
  { prefix: "/clientes", module: "clientes" },
  { prefix: "/proveedores", module: "proveedores" },
  { prefix: "/reportes", module: "reportes" },
  { prefix: "/configuracion", module: "configuracion" },
  { prefix: "/sincronizacion", module: "inicio" },
];

/** Módulo al que pertenece una URL, o null si la ruta no está restringida. */
export function moduleForPath(pathname: string): ModuleKey | null {
  const hit = MODULE_PATHS.find((m) => pathname === m.prefix || pathname.startsWith(`${m.prefix}/`));
  return hit?.module ?? null;
}

/** Primera ruta disponible para el usuario (fallback de redirección). */
export function firstAllowedPath(modules: Set<ModuleKey>): string {
  const hit = MODULE_PATHS.find((m) => modules.has(m.module));
  return hit?.prefix ?? "/inicio";
}
/** Roles principales de la plataforma (Etapa 1). */
export const CORE_ROLES: AppRole[] = ["admin", "management", "supervisor", "executive", "seller"];

/** Solo estos roles pueden crear usuarios, asignar roles y dar de baja. */
export const USER_ADMIN_ROLES: AppRole[] = ["admin", "superadmin"];

export function canManageUsers(roles: AppRole[]): boolean {
  // Acceso abierto temporal: cualquier usuario autenticado puede administrar usuarios.
  void roles;
  return true;
}
