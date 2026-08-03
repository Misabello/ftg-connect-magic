import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildCompositionPrompt,
  buildFinalVideoPrompt,
  sanitizeUserPrompt,
  NEGATIVE_PROMPT,
  PROMPT_TEMPLATE_VERSION,
  MAX_USER_PROMPT,
} from "./magic.prompts";
import { getVideoProvider, imageProvider, improvePromptWithAI } from "./magic.server";

const ImageInput = z.object({
  prompt: z.string().min(1).max(4000),
  customerImageUrl: z.string().min(1),
  characterImageUrl: z.string().min(1).nullable().optional(),
  aspectRatio: z.string().min(3).max(8),
  quality: z.enum(["preview", "final"]),
});

/** MODO FOTO: usa exclusivamente el proveedor de imagen. */
export const runImageGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ImageInput.parse(data))
  .handler(async ({ data }) => {
    const result = await imageProvider.generate({
      prompt: data.prompt,
      customerImageUrl: data.customerImageUrl,
      characterImageUrl: data.characterImageUrl ?? null,
      aspectRatio: data.aspectRatio,
      quality: data.quality,
    });
    return { outputType: "imagen" as const, ...result };
  });

const CompositionInput = z.object({
  customerImageUrl: z.string().min(1),
  characterImageUrl: z.string().min(1),
  characterName: z.string().min(1).max(120),
  characterDescription: z.string().max(600).nullable().optional(),
  background: z.string().min(1).max(60),
  style: z.string().min(1).max(60),
  aspectRatio: z.enum(["9:16", "1:1", "16:9"]),
  personSide: z.enum(["izquierda", "derecha"]),
  gapLevel: z.enum(["cerca", "media", "lejos"]),
  characterScale: z.number().min(0.6).max(1.6),
});

/** Fotograma de composición inicial con las dos figuras separadas. */
export const buildVideoComposition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => CompositionInput.parse(data))
  .handler(async ({ data }) => {
    const prompt = buildCompositionPrompt({
      characterName: data.characterName,
      characterDescription: data.characterDescription ?? null,
      background: data.background,
      style: data.style,
      aspectRatio: data.aspectRatio,
      personSide: data.personSide,
      gapLevel: data.gapLevel,
      characterScale: data.characterScale,
    });
    const result = await imageProvider.generate({
      prompt,
      customerImageUrl: data.customerImageUrl,
      characterImageUrl: data.characterImageUrl,
      aspectRatio: data.aspectRatio,
      quality: "preview",
    });
    return { compositionUrl: result.imageUrl, prompt, estimatedCost: result.estimatedCost };
  });

const VideoInput = z.object({
  compositionImageUrl: z.string().min(1),
  customerImageUrl: z.string().min(1),
  characterImageUrl: z.string().min(1).nullable().optional(),
  motion: z.string().min(1).max(40),
  userPrompt: z.string().max(MAX_USER_PROMPT).nullable().optional(),
  aspectRatio: z.enum(["9:16", "1:1", "16:9"]),
  durationSeconds: z.number().int().min(3).max(5),
  minResolution: z.enum(["720p", "1080p"]).default("720p"),
  engine: z.enum(["estandar", "abrazo", "economico"]).optional(),
});

/** MODO VIDEO: usa exclusivamente el proveedor de video y valida el MIME type. */
export const runVideoGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => VideoInput.parse(data))
  .handler(async ({ data, context }) => {
    const userPrompt = data.userPrompt ? sanitizeUserPrompt(data.userPrompt) : "";
    const finalPrompt = buildFinalVideoPrompt({
      motion: data.motion,
      userPrompt,
      durationSeconds: data.durationSeconds,
      aspectRatio: data.aspectRatio,
    });

    const provider = getVideoProvider();
    const result = await provider.generate({
      compositionImageUrl: data.compositionImageUrl,
      customerImageUrl: data.customerImageUrl,
      characterImageUrl: data.characterImageUrl ?? null,
      prompt: finalPrompt,
      negativePrompt: NEGATIVE_PROMPT,
      aspectRatio: data.aspectRatio,
      durationSeconds: data.durationSeconds,
      minResolution: data.minResolution,
      engine: data.engine,
      motion: data.motion,
    });

    return {
      outputType: "video" as const,
      ...result,
      userPrompt,
      finalPrompt,
      negativePrompt: NEGATIVE_PROMPT,
      promptVersion: PROMPT_TEMPLATE_VERSION,
      requestedBy: context.userId,
      params: {
        motion: data.motion,
        aspectRatio: data.aspectRatio,
        durationSeconds: data.durationSeconds,
        minResolution: data.minResolution,
        engine: data.engine ?? null,
      },
    };
  });

const ImproveInput = z.object({
  userPrompt: z.string().min(3).max(MAX_USER_PROMPT),
  language: z.enum(["es", "pt"]).default("es"),
});

/** Mejora el prompt escrito por el vendedor. */
export const improveVideoPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ImproveInput.parse(data))
  .handler(async ({ data }) => ({
    prompt: sanitizeUserPrompt(await improvePromptWithAI(data.userPrompt, data.language)),
  }));

const RemoteImageInput = z.object({ url: z.string().url() });

/** Precarga una fotografía de la galería como data URL para usarla en el estudio. */
export const loadRemoteImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => RemoteImageInput.parse(data))
  .handler(async ({ data }) => fetchImageAsDataUrl(data.url));
