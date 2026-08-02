/**
 * Proveedores de generación desacoplados (solo backend).
 *
 * ▸ Imagen  → Lovable AI Gateway (Gemini image).
 * ▸ Video   → fal.ai (Kling image-to-video). Requiere el secreto FAL_KEY.
 *
 * El modo Foto NUNCA usa el proveedor de video y el modo Video NUNCA usa el
 * endpoint de imágenes para producir el archivo final.
 */

export type ImageRequest = {
  prompt: string;
  customerImageUrl: string;
  characterImageUrl?: string | null;
  aspectRatio: string;
  quality: "preview" | "final";
};

export type ImageGenerationResult = {
  imageUrl: string;
  provider: string;
  model: string;
  estimatedCost: number;
};

/** Motores de video disponibles en la interfaz. */
export type VideoEngine = "estandar" | "abrazo" | "economico";

/** Duración máxima que la interfaz permite pedir. */
export const MAX_VIDEO_DURATION_SECONDS = 5;

export type VideoRequest = {
  /** Fotograma de composición aprobado: primer frame de la animación. */
  compositionImageUrl: string;
  /** Referencias originales (se envían si el modelo las soporta). */
  customerImageUrl: string;
  characterImageUrl?: string | null;
  prompt: string;
  negativePrompt: string;
  aspectRatio: string;
  durationSeconds: number;
  minResolution: "720p" | "1080p";
  /** Motor de video elegido en la interfaz. */
  engine?: VideoEngine;
  /** Movimiento seleccionado (define el ruteo automático al modelo de abrazo). */
  motion?: string;
};

export type VideoGenerationResult = {
  videoUrl: string;
  mimeType: string;
  sizeBytes: number | null;
  provider: string;
  model: string;
  providerJobId: string | null;
  estimatedCost: number;
};

export interface ImageGenerationProvider {
  readonly name: string;
  generate(req: ImageRequest): Promise<ImageGenerationResult>;
}

export interface VideoGenerationProvider {
  readonly name: string;
  readonly supportsTwoReferenceImages: boolean;
  generate(req: VideoRequest): Promise<VideoGenerationResult>;
}

export const UNSUPPORTED_VIDEO_MESSAGE =
  "El proveedor configurado no admite este tipo de generación de video.";

export const ALLOWED_VIDEO_MIME = ["video/mp4", "video/webm"];

/** Falla si el proveedor devolvió una imagen u otro archivo que no es video. */
export function assertVideoMime(mime: string | null | undefined) {
  const value = (mime ?? "").split(";")[0]!.trim().toLowerCase();
  if (!ALLOWED_VIDEO_MIME.includes(value)) {
    throw new Error(
      `El proveedor devolvió un archivo que no es video (${value || "desconocido"}). Se esperaba video/mp4 o video/webm.`,
    );
  }
  return value;
}

/* ───────────────────────────── Imagen ───────────────────────────── */

type GatewayResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
  choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
};

function extractImage(payload: GatewayResponse): string | null {
  const fromChat = payload.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (fromChat) return fromChat;
  const first = payload.data?.[0];
  if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
  return first?.url ?? null;
}

const IMAGE_MODEL = "google/gemini-3.1-flash-image";

export const lovableImageProvider: ImageGenerationProvider = {
  name: "lovable-ai",
  async generate(req) {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Falta la clave del servicio de IA");

    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: `${req.prompt}\nFormato de salida ${req.aspectRatio}.${
          req.quality === "preview" ? " Vista previa rápida." : " Máxima calidad de entrega."
        }`,
      },
      { type: "image_url", image_url: { url: req.customerImageUrl } },
    ];
    if (req.characterImageUrl) {
      content.push({ type: "image_url", image_url: { url: req.characterImageUrl } });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        messages: [{ role: "user", content }],
        modalities: ["image", "text"],
        stream: false,
      }),
    });

    if (response.status === 429) throw new Error("Límite de solicitudes alcanzado, probá en unos minutos");
    if (response.status === 402) throw new Error("Créditos de IA agotados en el espacio de trabajo");
    if (!response.ok) throw new Error(`Error del servicio de IA (${response.status})`);

    const payload = (await response.json()) as GatewayResponse;
    const image = extractImage(payload);
    if (!image) throw new Error("El servicio no devolvió una imagen");

    return {
      imageUrl: image,
      provider: "lovable-ai",
      model: IMAGE_MODEL,
      estimatedCost: req.quality === "final" ? 0.06 : 0.03,
    };
  },
};

/* ───────────────────────────── Video ───────────────────────────── */

/** Proveedor sin capacidad de video: siempre devuelve el error claro. */
export const unsupportedVideoProvider: VideoGenerationProvider = {
  name: "no-configurado",
  supportsTwoReferenceImages: false,
  async generate() {
    throw new Error(UNSUPPORTED_VIDEO_MESSAGE);
  },
};

/** Catálogo de modelos fal.ai por motor. */
export const VIDEO_MODELS = {
  /** Video estándar: rápido y económico, 6 s a 768p. */
  estandar: "fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video",
  /** Video abrazo: plantilla nativa "hug" de Vidu Q3. */
  abrazo: "fal-ai/vidu/q3/image-to-video",
  /** Modo económico: Wan 2.2 turbo a 720p. */
  economico: "fal-ai/wan/v2.2-a14b/image-to-video/turbo",
} as const satisfies Record<VideoEngine, string>;

/** Elige el motor: el modo económico manda, luego los movimientos de abrazo. */
export function resolveVideoEngine(req: Pick<VideoRequest, "engine" | "motion">): VideoEngine {
  if (req.engine === "economico") return "economico";
  if (req.engine === "abrazo") return "abrazo";
  if (req.engine === "estandar") return "estandar";
  return (req.motion ?? "").startsWith("abrazo") ? "abrazo" : "estandar";
}

function clampDuration(seconds: number) {
  return Math.min(Math.max(Math.round(seconds), 3), MAX_VIDEO_DURATION_SECONDS);
}

/** Cada modelo expone parámetros distintos: el cuerpo se arma por modelo. */
export function buildFalPayload(engine: VideoEngine, req: VideoRequest): Record<string, unknown> {
  const duration = clampDuration(req.durationSeconds);
  if (engine === "abrazo") {
    return {
      image_url: req.compositionImageUrl,
      template: "hug",
      prompt: req.prompt,
      duration,
      aspect_ratio: req.aspectRatio,
    };
  }
  if (engine === "economico") {
    return {
      prompt: req.prompt,
      negative_prompt: req.negativePrompt,
      image_url: req.compositionImageUrl,
      resolution: "720p",
    };
  }
  return {
    prompt: req.prompt,
    image_url: req.compositionImageUrl,
    duration: "6",
    resolution: "768P",
    prompt_optimizer: true,
  };
}

const ENGINE_COST: Record<VideoEngine, number> = {
  estandar: 0.22,
  abrazo: 0.35,
  economico: 0.1,
};

/**
 * fal.ai · Kling image-to-video.
 * Limitación real del proveedor: acepta UNA imagen inicial, por eso el flujo
 * compone antes las dos referencias en un fotograma aprobado y lo anima.
 */
export const falVideoProvider: VideoGenerationProvider = {
  name: "fal-ai",
  supportsTwoReferenceImages: false,
  async generate(req) {
    const key = process.env["FAL_KEY"];
    if (!key) throw new Error("Falta la clave del proveedor de video (FAL_KEY)");

    const engine = resolveVideoEngine(req);
    const model = VIDEO_MODELS[engine];

    const submit = await fetch(`https://queue.fal.run/${model}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildFalPayload(engine, req)),
    });

    if (submit.status === 401 || submit.status === 403) {
      const detail = await submit.text();
      if (/balance|locked|billing|quota/i.test(detail)) {
        throw new Error(
          "La cuenta del proveedor de video (fal.ai) no tiene saldo disponible. Cargá crédito en fal.ai para poder generar videos.",
        );
      }
      throw new Error(`La clave del proveedor de video es inválida (${submit.status})`);
    }
    if (submit.status === 429) throw new Error("El proveedor de video está saturado, probá en unos minutos");
    if (!submit.ok) throw new Error(`Error del proveedor de video (${submit.status}): ${await submit.text()}`);

    const queued = (await submit.json()) as { request_id?: string; status_url?: string; response_url?: string };
    const requestId = queued.request_id ?? null;
    const statusUrl = queued.status_url;
    const responseUrl = queued.response_url;
    if (!statusUrl || !responseUrl) throw new Error("El proveedor de video no devolvió un trabajo válido");

    const deadline = Date.now() + 8 * 60 * 1000;
    let payload: unknown = null;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 4000));
      const poll = await fetch(statusUrl, { headers: { Authorization: `Key ${key}` } });
      if (!poll.ok) throw new Error(`Error consultando el trabajo de video (${poll.status})`);
      const state = (await poll.json()) as { status?: string };
      if (state.status === "COMPLETED") {
        const done = await fetch(responseUrl, { headers: { Authorization: `Key ${key}` } });
        if (!done.ok) throw new Error(`Error obteniendo el video (${done.status})`);
        payload = await done.json();
        break;
      }
      if (state.status === "FAILED" || state.status === "ERROR") {
        throw new Error("El proveedor de video no pudo completar el trabajo");
      }
    }
    if (!payload) throw new Error("El proveedor de video agotó el tiempo de espera");

    const video = (payload as { video?: { url?: string; content_type?: string; file_size?: number } }).video;
    if (!video?.url) throw new Error("El proveedor de video no devolvió un archivo");

    const mimeType = assertVideoMime(video.content_type ?? "video/mp4");

    return {
      videoUrl: video.url,
      mimeType,
      sizeBytes: video.file_size ?? null,
      provider: "fal-ai",
      model,
      providerJobId: requestId,
      estimatedCost: ENGINE_COST[engine],
    };
  },
};

export const imageProvider: ImageGenerationProvider = lovableImageProvider;

/** Se resuelve en tiempo de ejecución: sin FAL_KEY no se simula video, se informa el error. */
export function getVideoProvider(): VideoGenerationProvider {
  return process.env["FAL_KEY"] ? falVideoProvider : unsupportedVideoProvider;
}

/** Mejora el prompt del vendedor con un modelo de chat, sin romper las reglas internas. */
export async function improvePromptWithAI(userPrompt: string, language: "es" | "pt") {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Falta la clave del servicio de IA");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [
        {
          role: "system",
          content:
            "Reescribís descripciones cortas de una animación entre una persona real y un personaje. " +
            "Devolvés UNA sola frase clara, concreta y visual, de menos de 300 caracteres, " +
            "sin instrucciones técnicas, sin pedir cambiar la identidad de las personas y sin superponer los cuerpos. " +
            (language === "pt" ? "Respondé en portugués." : "Respondé en español rioplatense."),
        },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (response.status === 429) throw new Error("Límite de solicitudes alcanzado, probá en unos minutos");
  if (response.status === 402) throw new Error("Créditos de IA agotados en el espacio de trabajo");
  if (!response.ok) throw new Error(`Error del servicio de IA (${response.status})`);

  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("El servicio no devolvió una sugerencia");
  return text;
}
