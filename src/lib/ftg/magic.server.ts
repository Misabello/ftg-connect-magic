/**
 * Proveedores de generación desacoplados.
 *
 * ▸ Para conectar un proveedor REAL solo hay que implementar estas interfaces
 *   y reemplazar `imageProvider` / `videoProvider` al final del archivo.
 *   Las claves de API viven exclusivamente acá (backend), nunca en el frontend.
 */

export type GenerationRequest = {
  prompt: string;
  customerImageUrl: string;
  characterImageUrl?: string | null;
  aspectRatio: string;
  quality: "preview" | "final";
};

export type ImageGenerationResult = {
  imageUrl: string;
  provider: string;
  estimatedCost: number;
  simulated: boolean;
};

export type VideoGenerationResult = {
  /** URL del video; null mientras el proveedor real de video no esté conectado */
  videoUrl: string | null;
  posterUrl: string | null;
  provider: string;
  estimatedCost: number;
  simulated: boolean;
};

export interface ImageGenerationProvider {
  readonly name: string;
  generate(req: GenerationRequest): Promise<ImageGenerationResult>;
}

export interface VideoGenerationProvider {
  readonly name: string;
  generate(
    req: GenerationRequest & { durationSeconds: number; action: string },
  ): Promise<VideoGenerationResult>;
}

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

/** Proveedor real de imagen (Lovable AI Gateway). */
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
        model: "google/gemini-3.1-flash-image",
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
      estimatedCost: req.quality === "final" ? 0.06 : 0.03,
      simulated: false,
    };
  },
};

/** Proveedor simulado de imagen: devuelve la propia foto del cliente, sin costo. */
export const simulatedImageProvider: ImageGenerationProvider = {
  name: "simulado",
  async generate(req) {
    await new Promise((r) => setTimeout(r, 1200));
    return { imageUrl: req.customerImageUrl, provider: "simulado", estimatedCost: 0, simulated: true };
  },
};

/**
 * Proveedor de video SIMULADO.
 * ▸ REEMPLAZAR ACÁ para conectar el proveedor real de video (image-to-video).
 *   Debe devolver `videoUrl` con el archivo generado o el id del trabajo remoto.
 */
export const simulatedVideoProvider: VideoGenerationProvider = {
  name: "simulado-video",
  async generate(req) {
    let poster: string | null = null;
    try {
      const frame = await lovableImageProvider.generate({
        ...req,
        prompt: `${req.prompt}\nFotograma clave representativo de la animación.`,
      });
      poster = frame.imageUrl;
    } catch {
      poster = req.customerImageUrl;
    }
    return {
      videoUrl: null,
      posterUrl: poster,
      provider: "simulado-video",
      estimatedCost: 0.05 * (req.durationSeconds / 5),
      simulated: true,
    };
  },
};

export const imageProvider: ImageGenerationProvider = lovableImageProvider;
export const videoProvider: VideoGenerationProvider = simulatedVideoProvider;
