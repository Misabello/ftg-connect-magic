export type PhotoStatus = "capturada" | "publicada" | "vendida" | "archivada";
export type SouvenirStatus = "en_cola" | "procesando" | "listo" | "error" | "entregado";

export const PHOTO_STATUS_LABEL: Record<PhotoStatus, string> = {
  capturada: "Capturada",
  publicada: "Publicada",
  vendida: "Vendida",
  archivada: "Archivada",
};

export const PHOTO_STATUS_TONE: Record<PhotoStatus, string> = {
  capturada: "bg-muted text-muted-foreground",
  publicada: "bg-primary/10 text-primary",
  vendida: "bg-success/10 text-success",
  archivada: "bg-muted text-muted-foreground",
};

export const SOUVENIR_STATUS_LABEL: Record<SouvenirStatus, string> = {
  en_cola: "En cola",
  procesando: "Procesando",
  listo: "Listo",
  error: "Con error",
  entregado: "Entregado",
};

export const SOUVENIR_STATUS_TONE: Record<SouvenirStatus, string> = {
  en_cola: "bg-muted text-muted-foreground",
  procesando: "bg-warning/15 text-warning",
  listo: "bg-success/10 text-success",
  error: "bg-destructive/10 text-destructive",
  entregado: "bg-primary/10 text-primary",
};

/** Código de visitante tipo VIS-1234 */
export function generateVisitorCode() {
  return `VIS-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function retentionDate(days = 90) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
