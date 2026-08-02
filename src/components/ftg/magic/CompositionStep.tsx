import { ArrowLeftRight, Check, Loader2, RefreshCw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export type GapLevel = "cerca" | "media" | "lejos";

export function CompositionStep({
  url,
  busy,
  approved,
  personSide,
  gapLevel,
  characterScale,
  onSwapSides,
  onGapChange,
  onScaleChange,
  onGenerate,
  onApprove,
}: {
  url: string | null;
  busy: boolean;
  approved: boolean;
  personSide: "izquierda" | "derecha";
  gapLevel: GapLevel;
  characterScale: number;
  onSwapSides: () => void;
  onGapChange: (value: GapLevel) => void;
  onScaleChange: (value: number) => void;
  onGenerate: () => void;
  onApprove: () => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Composición inicial
        </p>
        <Badge variant={approved ? "default" : "secondary"} className="text-[10px]">
          {approved ? "Aprobada" : "Sin aprobar"}
        </Badge>
      </div>

      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-muted">
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : url ? (
          <img src={url} alt="Composición inicial con ambas figuras" className="h-full w-full object-contain" />
        ) : (
          <p className="px-6 text-center text-xs text-muted-foreground">
            Generá el fotograma inicial: define dónde queda cada figura antes de animar.
          </p>
        )}
      </div>

      <div className="grid gap-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            Cliente a la {personSide} · personaje a la {personSide === "izquierda" ? "derecha" : "izquierda"}
          </span>
          <Button size="sm" variant="outline" className="h-7" disabled={busy} onClick={onSwapSides}>
            <ArrowLeftRight className="mr-1 h-3.5 w-3.5" /> Intercambiar
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-20 text-muted-foreground">Distancia</span>
          {(["cerca", "media", "lejos"] as GapLevel[]).map((g) => (
            <Button
              key={g}
              size="sm"
              variant={gapLevel === g ? "default" : "outline"}
              className="h-7 flex-1 text-xs capitalize"
              disabled={busy}
              onClick={() => onGapChange(g)}
            >
              {g}
            </Button>
          ))}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-muted-foreground">
            <span>Tamaño del personaje</span>
            <span>{characterScale.toFixed(2)}x</span>
          </div>
          <Slider
            min={0.6}
            max={1.6}
            step={0.05}
            value={[characterScale]}
            disabled={busy}
            onValueChange={([v]) => onScaleChange(v ?? 1)}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="secondary" className="flex-1" disabled={busy} onClick={onGenerate}>
          {busy ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : url ? (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          )}
          {url ? "Regenerar composición" : "Generar composición"}
        </Button>
        <Button size="sm" className="flex-1" disabled={!url || busy || approved} onClick={onApprove}>
          <Check className="mr-1.5 h-3.5 w-3.5" /> Aprobar composición
        </Button>
      </div>
    </div>
  );
}
