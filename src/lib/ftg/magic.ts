import fotin from "@/assets/characters/fotin.jpg";
import capitanLente from "@/assets/characters/capitan-lente.jpg";
import luna from "@/assets/characters/luna.jpg";
import rex from "@/assets/characters/rex.jpg";

export type OutputType = "imagen" | "video";

export type JobStatus =
  | "pendiente"
  | "en_cola"
  | "procesando"
  | "generando_preview"
  | "preview_listo"
  | "aprobado"
  | "generando_final"
  | "completado"
  | "error"
  | "cancelado";

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  pendiente: "Pendiente",
  en_cola: "En cola",
  procesando: "Procesando",
  generando_preview: "Generando vista previa",
  preview_listo: "Vista previa disponible",
  aprobado: "Aprobado",
  generando_final: "Generando archivo final",
  completado: "Completado",
  error: "Error",
  cancelado: "Cancelado",
};

export const JOB_STATUS_TONE: Record<JobStatus, string> = {
  pendiente: "bg-muted text-muted-foreground",
  en_cola: "bg-muted text-muted-foreground",
  procesando: "bg-warning/15 text-warning",
  generando_preview: "bg-warning/15 text-warning",
  preview_listo: "bg-primary/10 text-primary",
  aprobado: "bg-primary/10 text-primary",
  generando_final: "bg-warning/15 text-warning",
  completado: "bg-success/10 text-success",
  error: "bg-destructive/10 text-destructive",
  cancelado: "bg-muted text-muted-foreground",
};

/** Mensaje simple para el vendedor según el estado del trabajo. */
export const JOB_STATUS_MESSAGE: Record<JobStatus, string> = {
  pendiente: "Preparando el pedido…",
  en_cola: "Tu recuerdo está en la fila de trabajos.",
  procesando: "La IA está trabajando en el recuerdo.",
  generando_preview: "Armando la vista previa con marca de agua.",
  preview_listo: "Vista previa lista: revisala con el cliente.",
  aprobado: "Aprobado. Ya podés generar la entrega final.",
  generando_final: "Generando el archivo final en alta calidad.",
  completado: "¡Listo! El recuerdo está disponible.",
  error: "Hubo un problema. Podés reintentar.",
  cancelado: "El trabajo fue cancelado.",
};

export const VIDEO_ACTIONS = [
  { value: "saludar", label: "Saludar" },
  { value: "bailar", label: "Bailar" },
  { value: "abrazar", label: "Abrazar al cliente" },
  { value: "posar", label: "Posar para la cámara" },
  { value: "caminar", label: "Caminar juntos" },
  { value: "celebrar", label: "Celebrar" },
] as const;

export const ASPECT_RATIOS = [
  { value: "9:16", label: "Vertical 9:16" },
  { value: "1:1", label: "Cuadrado 1:1" },
  { value: "16:9", label: "Horizontal 16:9" },
] as const;

export const VISUAL_STYLES = [
  { value: "realista", label: "Realista" },
  { value: "ilustracion", label: "Ilustración" },
  { value: "acuarela", label: "Acuarela" },
  { value: "comic", label: "Cómic" },
  { value: "pixar", label: "Animación 3D" },
] as const;

export const BACKGROUNDS = [
  { value: "parque", label: "Parque temático" },
  { value: "estudio", label: "Fondo de estudio" },
  { value: "atardecer", label: "Atardecer" },
  { value: "fantasia", label: "Mundo de fantasía" },
  { value: "original", label: "Mantener el fondo original" },
] as const;

/** Duraciones ofrecidas en la interfaz: el máximo permitido es 5 segundos. */
export const VIDEO_DURATIONS = [3, 4, 5];

/** Precio sugerido de venta y costo estimado de generación. */
export const PRICING: Record<OutputType, { price: number; cost: number; product: string }> = {
  imagen: { price: 6500, cost: 0.04, product: "Foto mágica IA" },
  video: { price: 12500, cost: 0.35, product: "Video mágico IA" },
};

/** Portadas locales de los personajes semilla (fallback si no hay imagen en Storage). */
export const CHARACTER_FALLBACK_IMAGES: Record<string, string> = {
  "Fotín el Osito": fotin,
  "Capitán Lente": capitanLente,
  "Luna la Zorrita": luna,
  "Rex Dino": rex,
};

export const CHARACTER_PLACEHOLDER = fotin;

export type PromptInput = {
  outputType: OutputType;
  characterName: string;
  characterDescription: string | null;
  sceneTemplate: string;
  background: string;
  style: string;
  peopleCount: number;
  action?: string | null;
  durationSeconds?: number | null;
  extraInstruction?: string | null;
};

export const PROMPT_VERSION = "v1";

/**
 * Traduce las opciones de la interfaz a la instrucción interna.
 * El vendedor nunca ve ni edita este texto.
 */
export function buildInternalPrompt(input: PromptInput) {
  const bg = BACKGROUNDS.find((b) => b.value === input.background)?.label ?? input.background;
  const style = VISUAL_STYLES.find((s) => s.value === input.style)?.label ?? input.style;
  const action = VIDEO_ACTIONS.find((a) => a.value === input.action)?.label;

  const lines = [
    `Personaje aprobado: ${input.characterName}. ${input.characterDescription ?? ""}`.trim(),
    "Conservá EXACTAMENTE el diseño del personaje: rasgos, colores, vestimenta y proporciones de la imagen de referencia.",
    `Conservá la identidad facial de ${input.peopleCount === 1 ? "la persona" : `las ${input.peopleCount} personas`} de la fotografía: rostro, tono de piel, peinado y rasgos, sin alterarlos.`,
    `Escena: ${input.sceneTemplate}.`,
    `Fondo: ${bg}. Estilo visual: ${style}.`,
    "Integrá iluminación, perspectiva y sombras de forma coherente entre la persona y el personaje.",
  ];

  if (input.outputType === "video") {
    lines.push(
      `Animación corta de ${input.durationSeconds ?? 5} segundos donde el personaje realiza la acción: ${action ?? "saludar"}.`,
      "Mantené consistencia facial y de vestuario entre fotogramas; evitá deformaciones de rostro, manos y cuerpo.",
    );
  }

  if (input.extraInstruction?.trim()) lines.push(`Indicación del vendedor: ${input.extraInstruction.trim()}`);

  return lines.join("\n");
}

export const MAX_UPLOAD_MB = 12;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type MediaCheck = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  width: number;
  height: number;
};

/** Analiza resolución, luminosidad y nitidez aproximada de la foto cargada. */
export async function analyzeImage(dataUrl: string): Promise<MediaCheck> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("No se pudo leer la imagen"));
    el.src = dataUrl;
  });

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (w < 480 || h < 480) errors.push("La resolución es insuficiente (mínimo 480 px por lado).");
  else if (w < 900 || h < 900) warnings.push("Resolución baja: el resultado puede perder detalle.");

  const canvas = document.createElement("canvas");
  const size = 160;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const gray: number[] = [];
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const g = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
      gray.push(g);
      sum += g;
    }
    const mean = sum / gray.length;
    if (mean < 55) warnings.push("La fotografía se ve oscura: probá con mejor iluminación.");
    if (mean > 225) warnings.push("La fotografía se ve sobreexpuesta.");

    // Varianza tipo laplaciano: valores bajos indican desenfoque.
    let lap = 0;
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const i = y * size + x;
        const v = 4 * gray[i]! - gray[i - 1]! - gray[i + 1]! - gray[i - size]! - gray[i + size]!;
        lap += v * v;
      }
    }
    const sharpness = lap / ((size - 2) * (size - 2));
    if (sharpness < 40) warnings.push("La fotografía parece desenfocada.");
  }

  return { ok: errors.length === 0, errors, warnings, width: w, height: h };
}

/** Detección de rostro con la API del navegador cuando está disponible. */
export async function detectFaces(dataUrl: string): Promise<number | null> {
  const Detector = (globalThis as unknown as { FaceDetector?: new (o?: unknown) => { detect: (i: unknown) => Promise<unknown[]> } })
    .FaceDetector;
  if (!Detector) return null;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("error"));
      el.src = dataUrl;
    });
    const detector = new Detector({ fastMode: true });
    const faces = await detector.detect(img);
    return faces.length;
  } catch {
    return null;
  }
}

/** Recorta y rota una imagen en el cliente antes de subirla. */
export async function transformImage(
  dataUrl: string,
  opts: { rotation: number; zoom: number; ratio: string },
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("No se pudo procesar la imagen"));
    el.src = dataUrl;
  });

  const [rw, rh] = opts.ratio.split(":").map(Number);
  const target = 1024;
  const outW = rw! >= rh! ? target : Math.round((target * rw!) / rh!);
  const outH = rh! > rw! ? target : Math.round((target * rh!) / rw!);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0b1020";
  ctx.fillRect(0, 0, outW, outH);
  ctx.translate(outW / 2, outH / 2);
  ctx.rotate((opts.rotation * Math.PI) / 180);

  const rotated = opts.rotation % 180 !== 0;
  const boxW = rotated ? outH : outW;
  const boxH = rotated ? outW : outH;
  const scale = Math.max(boxW / img.naturalWidth, boxH / img.naturalHeight) * opts.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);

  return canvas.toDataURL("image/jpeg", 0.92);
}

export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

export function dataUrlToBlob(dataUrl: string) {
  const [header, body] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(header ?? "")?.[1] ?? "image/jpeg";
  const bytes = atob(body ?? "");
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}