import { useState } from "react";
import { Loader2, RotateCcw, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { improveVideoPrompt } from "@/lib/ftg/magic.functions";
import { MAX_USER_PROMPT, VIDEO_MOTION_TEMPLATES } from "@/lib/ftg/magic.prompts";

const PLACEHOLDER =
  "Describí qué querés que hagan el cliente y el personaje. Por ejemplo: se saludan, bailan juntos y terminan mirando a cámara.";

export function VideoPromptPanel({
  value,
  onChange,
  finalPrompt,
  language,
}: {
  value: string;
  onChange: (value: string) => void;
  finalPrompt: string;
  language: "es" | "pt";
}) {
  const [busy, setBusy] = useState(false);
  const improve = useServerFn(improveVideoPrompt);

  return (
    <Collapsible className="rounded-lg border border-border">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium">
        Personalizar video con IA
        <span className="text-xs text-muted-foreground">
          {value.length}/{MAX_USER_PROMPT}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 border-t border-border p-3">
        <div className="flex flex-wrap gap-1.5">
          {VIDEO_MOTION_TEMPLATES.map((t) => (
            <Button
              key={t.value}
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onChange(t.label)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        <Textarea
          rows={3}
          maxLength={MAX_USER_PROMPT}
          value={value}
          placeholder={PLACEHOLDER}
          onChange={(e) => onChange(e.target.value)}
        />

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy || value.trim().length < 3}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await improve({ data: { userPrompt: value.trim(), language } });
                onChange(result.prompt);
              } catch (error) {
                toast.error("No pudimos mejorar el texto", {
                  description: error instanceof Error ? error.message : undefined,
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Wand2 className="mr-1.5 h-3.5 w-3.5" />}
            Mejorar prompt con IA
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restablecer
          </Button>
        </div>

        <details className="rounded-md bg-muted/60 p-2 text-xs text-muted-foreground">
          <summary className="cursor-pointer">Vista previa del prompt final</summary>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap">{finalPrompt}</pre>
        </details>
      </CollapsibleContent>
    </Collapsible>
  );
}
