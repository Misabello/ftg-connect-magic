/**
 * Construcción de prompts (módulo puro, sin secretos ni red).
 * Se comparte entre el backend y la interfaz para poder mostrar la vista previa
 * del prompt final, pero SOLO el backend llama al proveedor de IA.
 */

export const PROMPT_TEMPLATE_VERSION = "v2-video";

/** Prompt negativo interno obligatorio. */
export const NEGATIVE_PROMPT =
  "overlapping bodies, fused characters, duplicated people, duplicate faces, extra arms, extra legs, extra hands, malformed hands, distorted face, identity change, character redesign, body collision, clipping, flickering, inconsistent clothing, unstable background, low resolution, blur";

export const MAX_USER_PROMPT = 400;

export const VIDEO_MOTION_TEMPLATES = [
  {
    value: "abrazo",
    label: "Abrazo entre el cliente y el personaje",
    prompt:
      "Begin with the person on the left and the character on the right, both fully visible and physically separated. They turn naturally toward each other, approach slowly and share a warm, friendly hug, then finish standing together looking toward the camera.",
  },
  {
    value: "abrazo_lateral",
    label: "Abrazo lateral",
    prompt:
      "Both subjects stay side by side, the character gently places one arm around the person's shoulders for a side hug, and both smile toward the camera.",
  },
  {
    value: "abrazo_breve",
    label: "Abrazo breve",
    prompt:
      "The two subjects step toward each other, share a very short friendly hug, separate again and wave at the camera.",
  },
  { value: "saludar", label: "Se saludan", prompt: "Both subjects wave and greet each other cheerfully, keeping a clear distance between their bodies." },
  { value: "bailar", label: "Bailan juntos", prompt: "Both subjects dance together with simple, playful steps, staying clearly separated." },
  { value: "caminar", label: "Caminan juntos", prompt: "Both subjects walk together toward the camera at a calm pace, side by side." },
  { value: "celebrar", label: "Celebran", prompt: "Both subjects celebrate with raised arms and happy expressions, staying clearly separated." },
  { value: "posar", label: "Posan para una fotografía", prompt: "Both subjects pose next to each other for a photograph and hold the pose looking at the camera." },
] as const;

export type MotionTemplate = (typeof VIDEO_MOTION_TEMPLATES)[number]["value"];

export function motionTemplate(value: string) {
  return VIDEO_MOTION_TEMPLATES.find((t) => t.value === value) ?? VIDEO_MOTION_TEMPLATES[0];
}

const QUALITY_RULES =
  "High quality, sharp, well lit, stable camera, consistent lighting and shadows, coherent perspective.";

const IDENTITY_RULES =
  "Preserve the exact identity and facial features of the real person (face, skin tone, hair, clothing). Preserve the approved design, colors and clothing of the character. Never redesign, swap or merge the two subjects.";

const SEPARATION_RULES =
  "Keep the two subjects as two distinct bodies with correct depth and occlusion: no overlapping torsos, no fused limbs, no duplicated people, anatomically correct arms and hands, realistic body spacing and consistent proportions.";

const CAMERA_RULES =
  "Static or very slow camera, subjects centered and fully in frame, consistent framing and background across every frame.";

/** Prompt para el fotograma de composición inicial (imagen con las dos figuras). */
export function buildCompositionPrompt(input: {
  characterName: string;
  characterDescription?: string | null;
  background: string;
  style: string;
  aspectRatio: string;
  personSide: "izquierda" | "derecha";
  gapLevel: "cerca" | "media" | "lejos";
  characterScale: number;
}) {
  const personLeft = input.personSide === "izquierda";
  const gap =
    input.gapLevel === "cerca" ? "a small but clear gap" : input.gapLevel === "lejos" ? "a wide gap" : "a comfortable gap";
  return [
    `Create a single composition frame in ${input.aspectRatio} format, ${input.style} style, background: ${input.background}.`,
    `Place the real person from the first reference photo on the ${personLeft ? "LEFT" : "RIGHT"} side and the character "${input.characterName}" from the second reference image on the ${personLeft ? "RIGHT" : "LEFT"} side.`,
    `${input.characterDescription ?? ""}`.trim(),
    `Leave ${gap} between the two bodies so they never overlap or touch. Character scale relative to the person: ${input.characterScale.toFixed(2)}x.`,
    IDENTITY_RULES,
    SEPARATION_RULES,
    QUALITY_RULES,
    `Avoid: ${NEGATIVE_PROMPT}.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Prompt final de video.
 * prompt_final = calidad + identidad + plantilla de movimiento + prompt del usuario
 *                + cámara + prompt negativo
 */
export function buildFinalVideoPrompt(input: {
  motion: string;
  userPrompt?: string | null;
  durationSeconds: number;
  aspectRatio: string;
}) {
  const template = motionTemplate(input.motion);
  const user = (input.userPrompt ?? "").trim().slice(0, MAX_USER_PROMPT);
  return [
    `Create a short, high-quality ${input.durationSeconds}-second video in ${input.aspectRatio} format using the approved composition frame as the first frame.`,
    QUALITY_RULES,
    IDENTITY_RULES,
    template.prompt,
    user ? `Additional request from the operator (must respect all the rules above): ${user}` : "",
    SEPARATION_RULES,
    CAMERA_RULES,
    `Do not include: ${NEGATIVE_PROMPT}.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Sanea el prompt del usuario: recorta y elimina intentos de anular las reglas internas. */
export function sanitizeUserPrompt(raw: string) {
  return raw
    .replace(/\b(ignore|olvida|ignora|forget|override|disregard)\b[^.\n]*/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_USER_PROMPT);
}
