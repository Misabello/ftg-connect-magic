import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  imageUrl: z.string().min(1),
  prompt: z.string().min(1),
});

type GatewayResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
  choices?: Array<{
    message?: {
      images?: Array<{ image_url?: { url?: string } }>;
    };
  }>;
};

function extractImage(payload: GatewayResponse): string | null {
  const fromChat = payload.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (fromChat) return fromChat;
  const first = payload.data?.[0];
  if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
  if (first?.url) return first.url;
  return null;
}

/** Genera un recuerdo tematizado a partir de la foto original. */
export const generateSouvenir = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Falta la clave del servicio de IA");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: data.prompt },
              { type: "image_url", image_url: { url: data.imageUrl } },
            ],
          },
        ],
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

    return { imageUrl: image, estimatedCost: 0.02 };
  });
