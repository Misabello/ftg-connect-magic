/** Análisis de rostros de la fotografía (solo backend: usa la clave de IA). */

const VISION_MODEL = "google/gemini-3.6-flash";

const SYSTEM = [
  "Analizás fotografías de clientes de un parque temático para preparar una caricatura grupal.",
  "Detectá TODAS las personas con el rostro visible, incluida la persona principal.",
  "Devolvé un JSON con la clave \"faces\": una entrada por persona, ordenadas de izquierda a derecha.",
  "Cada entrada tiene: box (x, y, width, height como fracciones de 0 a 1 del ancho y alto de la imagen, encuadrando la cabeza),",
  "position (ubicación breve en el grupo, en español), description (edad aparente, peinado, tono de piel, vestimenta y accesorios, en español, sin nombres ni datos sensibles)",
  "y minor (true si aparenta ser menor de edad).",
  "No inventes personas que no estén en la imagen y no omitas ninguna.",
].join(" ");

export type RawFace = {
  box?: { x?: number; y?: number; width?: number; height?: number } | null;
  description?: string | null;
  position?: string | null;
  minor?: boolean | null;
};

export async function detectFacesWithAI(imageUrl: string): Promise<{ faces: RawFace[]; model: string }> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Falta la clave del servicio de IA");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: "Detectá todas las personas con rostro visible y devolvé el JSON pedido." },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (response.status === 429) throw new Error("Límite de solicitudes alcanzado, probá en unos minutos");
  if (response.status === 402) throw new Error("Créditos de IA agotados en el espacio de trabajo");
  if (!response.ok) throw new Error(`Error del servicio de análisis (${response.status})`);

  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content ?? "";
  let faces: RawFace[] = [];
  try {
    const parsed = JSON.parse(content) as { faces?: RawFace[] } | RawFace[];
    faces = Array.isArray(parsed) ? parsed : (parsed.faces ?? []);
  } catch {
    throw new Error("El análisis no devolvió un resultado legible");
  }
  return { faces: faces.filter((f) => !!f), model: VISION_MODEL };
}
