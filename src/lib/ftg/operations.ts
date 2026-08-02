export type OperationalStatus =
  | "planificado"
  | "preparacion"
  | "listo"
  | "en_operacion"
  | "incidente"
  | "cerrado";

export type IncidentSeverity = "baja" | "media" | "alta" | "critica";
export type IncidentStatus = "abierto" | "en_curso" | "resuelto";
export type ChecklistPhase = "apertura" | "cierre";

export const STATUS_FLOW: OperationalStatus[] = [
  "planificado",
  "preparacion",
  "listo",
  "en_operacion",
  "incidente",
  "cerrado",
];

export const STATUS_LABEL: Record<OperationalStatus, string> = {
  planificado: "Planificado",
  preparacion: "En preparación",
  listo: "Listo para abrir",
  en_operacion: "En operación",
  incidente: "Con incidente",
  cerrado: "Cerrado",
};

export const STATUS_TONE: Record<OperationalStatus, string> = {
  planificado: "bg-muted text-muted-foreground",
  preparacion: "bg-warning/15 text-warning",
  listo: "bg-primary/10 text-primary",
  en_operacion: "bg-success/10 text-success",
  incidente: "bg-destructive/10 text-destructive",
  cerrado: "bg-muted text-muted-foreground",
};

export const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
};

export const SEVERITY_TONE: Record<IncidentSeverity, string> = {
  baja: "bg-muted text-muted-foreground",
  media: "bg-warning/15 text-warning",
  alta: "bg-destructive/10 text-destructive",
  critica: "bg-destructive text-destructive-foreground",
};

export const INCIDENT_STATUS_LABEL: Record<IncidentStatus, string> = {
  abierto: "Abierto",
  en_curso: "En curso",
  resuelto: "Resuelto",
};

export const ROLE_LABEL: Record<string, string> = {
  superadmin: "Superadmin",
  direccion: "Dirección",
  administracion: "Administración",
  operaciones: "Operaciones",
  encargado_sede: "Encargado de sede",
  supervisor: "Supervisor",
  cajero: "Cajero",
  fotografo: "Fotógrafo",
  deposito: "Depósito",
  auditor: "Auditor",
};

export const STAFF_ROLES = [
  "encargado_sede",
  "supervisor",
  "cajero",
  "fotografo",
  "deposito",
] as const;

export const INCIDENT_CATEGORIES = [
  "operativo",
  "equipamiento",
  "personal",
  "clima",
  "cliente",
  "sistemas",
] as const;

/** Checklist base que se copia al crear una jornada. */
export const DEFAULT_CHECKLIST: { phase: ChecklistPhase; label: string; is_required: boolean }[] = [
  { phase: "apertura", label: "Verificar conectividad y sincronización de dispositivos", is_required: true },
  { phase: "apertura", label: "Contar fondo inicial de caja", is_required: true },
  { phase: "apertura", label: "Revisar stock de insumos e impresoras", is_required: true },
  { phase: "apertura", label: "Chequear cámaras, baterías y tarjetas de memoria", is_required: true },
  { phase: "apertura", label: "Cartelería de precios visible y actualizada", is_required: false },
  { phase: "cierre", label: "Cerrar caja y registrar arqueo", is_required: true },
  { phase: "cierre", label: "Respaldar y subir fotografías del día", is_required: true },
  { phase: "cierre", label: "Registrar incidentes y observaciones", is_required: false },
  { phase: "cierre", label: "Guardar equipamiento y apagar puestos", is_required: true },
];

export function checklistProgress(items: { phase: string; is_done: boolean }[], phase: ChecklistPhase) {
  const scoped = items.filter((i) => i.phase === phase);
  const done = scoped.filter((i) => i.is_done).length;
  return { done, total: scoped.length, pct: scoped.length ? Math.round((done / scoped.length) * 100) : 0 };
}
