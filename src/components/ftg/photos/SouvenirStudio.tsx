import { useEffect, useState } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { PhotoRow } from "@/components/ftg/photos/PhotoGrid";

export type TemplateRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  style: string;
  prompt: string;
  license_owner: string | null;
};

export function SouvenirStudio({
  photo,
  templates,
  open,
  onOpenChange,
  onGenerate,
  onSave,
}: {
  photo: PhotoRow | null;
  templates: TemplateRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (args: { photo: PhotoRow; template: TemplateRow; prompt: string }) => Promise<string>;
  onSave: (args: {
    photo: PhotoRow;
    template: TemplateRow;
    prompt: string;
    resultUrl: string;
    watermarked: boolean;
  }) => Promise<void>;
}) {
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [watermark, setWatermark] = useState(true);
  const [busy, setBusy] = useState(false);

  const template = templates.find((t) => t.id === templateId) ?? null;

  useEffect(() => {
    if (!open) return;
    const first = templates[0] ?? null;
    setTemplateId(first?.id ?? null);
    setPrompt(first?.prompt ?? "");
    setResult(null);
    setBusy(false);
  }, [open, templates]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" /> Crear recuerdo mágico
          </DialogTitle>
          <DialogDescription>
            {photo ? `Visitante ${photo.visitor_code}` : ""} · plantillas licenciadas y vista previa con marca de agua.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Plantilla</p>
            <div className="grid grid-cols-2 gap-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTemplateId(t.id);
                    setPrompt(t.prompt);
                  }}
                  className={cn(
                    "rounded-lg border border-border p-3 text-left text-sm transition-colors hover:border-primary",
                    templateId === t.id && "border-primary bg-primary/5",
                  )}
                >
                  <span className="block font-medium">{t.name}</span>
                  <span className="block text-xs text-muted-foreground">{t.description ?? t.style}</span>
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Indicación</p>
              <Textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
            </div>
            <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              <span>Marca de agua en la vista previa</span>
              <Switch checked={watermark} onCheckedChange={setWatermark} />
            </label>
            {template?.license_owner && (
              <p className="text-xs text-muted-foreground">Licencia: {template.license_owner}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <figure className="space-y-1">
              <figcaption className="text-xs text-muted-foreground">Original</figcaption>
              <div className="aspect-[3/4] overflow-hidden rounded-lg bg-muted">
                {photo && (
                  <img src={photo.image_url} alt="Fotografía original" className="h-full w-full object-cover" />
                )}
              </div>
            </figure>
            <figure className="space-y-1">
              <figcaption className="text-xs text-muted-foreground">Recuerdo IA</figcaption>
              <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-muted">
                {busy && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
                {!busy && result && (
                  <>
                    <img src={result} alt="Recuerdo generado con IA" className="h-full w-full object-cover" />
                    {watermark && (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg font-semibold tracking-[0.3em] text-background/70 mix-blend-overlay">
                        FTG · MUESTRA
                      </span>
                    )}
                  </>
                )}
                {!busy && !result && (
                  <span className="px-4 text-center text-xs text-muted-foreground">
                    Generá la vista previa para comparar con el original.
                  </span>
                )}
              </div>
            </figure>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="secondary"
            disabled={!photo || !template || busy}
            onClick={async () => {
              if (!photo || !template) return;
              setBusy(true);
              try {
                setResult(await onGenerate({ photo, template, prompt }));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
            Generar vista previa
          </Button>
          <Button
            disabled={!photo || !template || !result || busy}
            onClick={async () => {
              if (!photo || !template || !result) return;
              setBusy(true);
              try {
                await onSave({ photo, template, prompt, resultUrl: result, watermarked: watermark });
                onOpenChange(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            Guardar recuerdo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
