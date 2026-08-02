import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { imageProvider, videoProvider } from "./magic.server";

const Input = z.object({
  prompt: z.string().min(1).max(4000),
  customerImageUrl: z.string().min(1),
  characterImageUrl: z.string().min(1).nullable().optional(),
  aspectRatio: z.string().min(3).max(8),
  quality: z.enum(["preview", "final"]),
  outputType: z.enum(["imagen", "video"]),
  durationSeconds: z.number().int().min(3).max(15).optional(),
  action: z.string().max(40).optional(),
});

/** Ejecuta un trabajo de generación (foto o video) contra el proveedor configurado. */
export const runMagicGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    if (data.outputType === "video") {
      const result = await videoProvider.generate({
        prompt: data.prompt,
        customerImageUrl: data.customerImageUrl,
        characterImageUrl: data.characterImageUrl ?? null,
        aspectRatio: data.aspectRatio,
        quality: data.quality,
        durationSeconds: data.durationSeconds ?? 5,
        action: data.action ?? "saludar",
      });
      return {
        outputType: "video" as const,
        mediaUrl: result.videoUrl,
        posterUrl: result.posterUrl,
        provider: result.provider,
        estimatedCost: result.estimatedCost,
        simulated: result.simulated,
      };
    }

    const result = await imageProvider.generate({
      prompt: data.prompt,
      customerImageUrl: data.customerImageUrl,
      characterImageUrl: data.characterImageUrl ?? null,
      aspectRatio: data.aspectRatio,
      quality: data.quality,
    });
    return {
      outputType: "imagen" as const,
      mediaUrl: result.imageUrl,
      posterUrl: result.imageUrl,
      provider: result.provider,
      estimatedCost: result.estimatedCost,
      simulated: result.simulated,
    };
  });