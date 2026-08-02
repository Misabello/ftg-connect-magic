import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AGENT_SYSTEM_PROMPT, buildDataSnapshot } from "./agent.server";

const Input = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(20),
  language: z.enum(["es", "pt"]).optional(),
});

type ChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

/** Responde preguntas sobre los datos del ERP usando Lovable AI. */
export const askDataAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Falta la clave del servicio de IA");

    const snapshot = await buildDataSnapshot(context.supabase);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: AGENT_SYSTEM_PROMPT },
          {
            role: "system",
            content:
              data.language === "pt"
                ? "Responda sempre em português do Brasil, com termos de varejo e ERP."
                : "Respondé siempre en español rioplatense.",
          },
          {
            role: "system",
            content: `Snapshot actual de la base (JSON):\n${JSON.stringify(snapshot)}`,
          },
          ...data.messages,
        ],
      }),
    });

    if (response.status === 429) throw new Error("Límite de solicitudes alcanzado, probá en unos minutos");
    if (response.status === 402) throw new Error("Créditos de IA agotados en el espacio de trabajo");
    if (!response.ok) {
      const body = await response.text();
      console.error(`[agent] gateway ${response.status}: ${body}`);
      throw new Error(`Error del servicio de IA (${response.status})`);
    }

    const payload = (await response.json()) as ChatResponse;
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("El agente no devolvió respuesta");

    return { content };
  });