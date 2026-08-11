import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildCaricaturePrompt,
  caricatureCost,
  CARICATURE_NEGATIVE_PROMPT,
  CARICATURE_PROMPT_VERSION,
  MAX_CARICATURE_NOTE,
  normalizeFaces,
} from "./caricature";
import { detectFacesWithAI } from "./caricature.server";
import { imageProvider } from "./magic.server";

const DetectInput = z.object({ imageUrl: z.string().min(1) });

/** Detecta todas las personas de la fotografía y les asigna un identificador interno. */
export const detectPhotoFaces = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => DetectInput.parse(data))
  .handler(async ({ data }) => {
    const { faces, model } = await detectFacesWithAI(data.imageUrl);
    return { faces: normalizeFaces(faces), model };
  });

const FaceInput = z.object({
  id: z.string().min(1).max(12),
  label: z.string().min(1).max(40),
  description: z.string().max(400),
  position: z.string().max(120),
  selected: z.boolean(),
});

const CaricatureInput = z.object({
  imageUrl: z.string().min(1),
  faces: z.array(FaceInput).min(1).max(20),
  style: z.string().min(1).max(40),
  background: z.string().min(1).max(40),
  note: z.string().max(MAX_CARICATURE_NOTE).nullable().optional(),
  aspectRatio: z.string().min(3).max(8).default("1:1"),
  quality: z.enum(["preview", "final"]),
});

/** Caricaturiza a todas las personas seleccionadas de la fotografía. */
export const runCaricatureGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => CaricatureInput.parse(data))
  .handler(async ({ data, context }) => {
    const selected = data.faces.filter((f) => f.selected);
    if (selected.length === 0) throw new Error("Seleccioná al menos una persona para caricaturizar");

    const prompt = buildCaricaturePrompt({
      faces: data.faces,
      style: data.style,
      background: data.background,
      note: data.note ?? null,
      quality: data.quality,
    });

    const result = await imageProvider.generate({
      prompt,
      customerImageUrl: data.imageUrl,
      characterImageUrl: null,
      aspectRatio: data.aspectRatio,
      quality: data.quality,
    });

    return {
      imageUrl: result.imageUrl,
      provider: result.provider,
      model: result.model,
      prompt,
      negativePrompt: CARICATURE_NEGATIVE_PROMPT,
      promptVersion: CARICATURE_PROMPT_VERSION,
      estimatedCost: caricatureCost(selected.length, data.quality),
      facesSelected: selected.length,
      facesDetected: data.faces.length,
      requestedBy: context.userId,
    };
  });
