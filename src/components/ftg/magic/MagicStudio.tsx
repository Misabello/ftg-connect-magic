import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  Check,
  Download,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { runMagicGeneration } from "@/lib/ftg/magic.functions";
import {
  ASPECT_RATIOS,
  BACKGROUNDS,
  JOB_STATUS_LABEL,
  JOB_STATUS_MESSAGE,
  JOB_STATUS_TONE,
  PRICING,
  PROMPT_VERSION,
  VIDEO_ACTIONS,
  VIDEO_DURATIONS,
  VISUAL_STYLES,
  buildInternalPrompt,
  dataUrlToBlob,
  type JobStatus,
  type OutputType,
} from "@/lib/ftg/magic";
import { CharacterLibrary, characterImage, type CharacterRow } from "./CharacterLibrary";
import { CustomerPhotoStep, type CustomerPhoto } from "./CustomerPhotoStep";

type SceneRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  output_type: OutputType;
  prompt_template: string;
  aspect_ratios: string[];
  available_actions: string[];
  sort_order: number;
};

const BUCKET = "customer-media";

export function MagicStudio({
  open,
  onOpenChange,
  locationId,
  organizationId,
  pointOfSaleId,
  locations,
  onAddToCart,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string | null;
  organizationId: string | null;
  pointOfSaleId?: string | null;
  locations: { id: string; name: string }[];
  onAddToCart?: (item: { outputType: OutputType; jobId: string; price: number; label: string }) => void;
}) {
  const { user } = useAuth();

  const [outputType, setOutputType] = useState<OutputType>("imagen");
  const [photo, setPhoto] = useState<CustomerPhoto | null>(null);
  const [character, setCharacter] = useState<CharacterRow | null>(null);
  const [sceneId, setSceneId] = useState<string | null>(null);
  const [background, setBackground] = useState("parque");
  const [style, setStyle] = useState("realista");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [action, setAction] = useState("saludar");
  const [duration, setDuration] = useState(5);
  const [extra, setExtra] = useState("");
  const [consent, setConsent] = useState(false);
  const [guardian, setGuardian] = useState(false);
  const [minor, setMinor] = useState(false);

  const [status, setStatus] = useState<JobStatus>("pendiente");
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [finalUrl, setFinalUrl] = useState<string | null>(null);
  const [simulated, setSimulated] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const generate = useServerFn(runMagicGeneration);

  const { data: characters = [] } = useQuery({
    queryKey: ["ai-characters"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_characters")
        .select("id, name, description, category, location_id, venue_id, styles, supports_image, supports_video, usage_count")
        .eq("active", true)
        .eq("approved", true)
        .order("usage_count", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CharacterRow[];
    },
  });

  const { data: scenes = [] } = useQuery({
    queryKey: ["ai-scenes"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_scenes")
        .select("id, code, name, description, output_type, prompt_template, aspect_ratios, available_actions, sort_order")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as SceneRow[];
    },
  });

  const sceneOptions = scenes.filter((s) => s.output_type === outputType);
  const scene = sceneOptions.find((s) => s.id === sceneId) ?? null;

  useEffect(() => {
    if (!open) return;
    resetAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    setSceneId(sceneOptions[0]?.id ?? null);
    setAspectRatio(outputType === "video" ? "9:16" : "1:1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outputType, scenes.length]);

  function resetAll() {
    setOutputType("imagen");
    setPhoto(null);
    setCharacter(null);
    setExtra("");
    setConsent(false);
    setGuardian(false);
    setMinor(false);
    resetJob();
  }

  function resetJob() {
    setStatus("pendiente");
    setProgress(0);
    setJobId(null);
    setPreviewUrl(null);
    setFinalUrl(null);
    setSimulated(false);
    setErrorMessage(null);
  }

  const busy =
    status === "en_cola" || status === "procesando" || status === "generando_preview" || status === "generando_final";

  const canGenerate =
    !!photo && !!character && !!scene && consent && (!minor || guardian) && !busy && !!user;

  const pricing = PRICING[outputType];

  /** Sube un archivo privado al bucket y devuelve la ruta. */
  async function upload(path: string, dataUrl: string, contentType: string) {
    const { error } = await supabase.storage.from(BUCKET).upload(path, dataUrlToBlob(dataUrl), {
      contentType,
      upsert: true,
    });
    if (error) throw error;
    return path;
  }

  /** Convierte una imagen local (personaje) a data URL para enviarla al proveedor. */
  async function toDataUrl(src: string) {
    const res = await fetch(src);
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });
  }

  async function startPreview() {
    if (!photo || !character || !scene || !user) return;
    resetJob();
    setStatus("en_cola");
    setProgress(8);

    const prompt = buildInternalPrompt({
      outputType,
      characterName: character.name,
      characterDescription: character.description,
      sceneTemplate: scene.prompt_template,
      background,
      style,
      peopleCount: photo.peopleCount,
      action: outputType === "video" ? action : null,
      durationSeconds: outputType === "video" ? duration : null,
      extraInstruction: extra,
    });

    const timer = window.setInterval(() => setProgress((p) => Math.min(p + 4, 88)), 500);

    try {
      const mediaPath = `${user.id}/${crypto.randomUUID()}.jpg`;
      await upload(mediaPath, photo.dataUrl, "image/jpeg");

      setStatus("procesando");
      const { data: job, error: jobError } = await supabase
        .from("ai_generation_jobs")
        .insert({
          organization_id: organizationId,
          location_id: locationId,
          point_of_sale_id: pointOfSaleId ?? null,
          output_type: outputType,
          customer_media_path: mediaPath,
          character_id: character.id,
          scene_id: scene.id,
          action: outputType === "video" ? action : null,
          aspect_ratio: aspectRatio,
          duration_seconds: outputType === "video" ? duration : null,
          style,
          people_count: photo.peopleCount,
          extra_instruction: extra || null,
          status: "generando_preview",
          progress: 20,
          provider: outputType === "video" ? "simulado-video" : "lovable-ai",
          prompt_version: PROMPT_VERSION,
          prompt_used: prompt,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (jobError) throw jobError;
      setJobId(job.id);

      await supabase.from("customer_consents").insert({
        organization_id: organizationId,
        location_id: locationId,
        job_id: job.id,
        customer_media_path: mediaPath,
        consent_type: minor ? "menor_con_tutor" : "titular",
        guardian_confirmation: minor ? guardian : false,
        purpose: "Generación de recuerdo con IA y entrega al cliente",
        retention_policy: "Se elimina a los 30 días salvo pedido del cliente",
        device_label: navigator.userAgent.slice(0, 120),
        accepted_by: user.id,
      });

      setStatus("generando_preview");
      const characterUrl = await toDataUrl(characterImage(character));

      const result = await generate({
        data: {
          prompt,
          customerImageUrl: photo.dataUrl,
          characterImageUrl: characterUrl,
          aspectRatio,
          quality: "preview",
          outputType,
          durationSeconds: outputType === "video" ? duration : undefined,
          action: outputType === "video" ? action : undefined,
        },
      });

      const media = result.mediaUrl ?? result.posterUrl;
      if (!media) throw new Error("El proveedor no devolvió contenido");

      const previewPath = `${user.id}/previews/${job.id}.jpg`;
      await upload(previewPath, media, "image/jpeg");

      setPreviewUrl(media);
      setSimulated(result.simulated);
      setStatus("preview_listo");
      setProgress(100);

      await supabase
        .from("ai_generation_jobs")
        .update({ status: "preview_listo", progress: 100, preview_path: previewPath, estimated_cost: result.estimatedCost, provider: result.provider })
        .eq("id", job.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      setErrorMessage(message);
      setStatus("error");
      setProgress(0);
      if (jobId) await supabase.from("ai_generation_jobs").update({ status: "error", error_message: message }).eq("id", jobId);
      toast.error("No pudimos generar el recuerdo", { description: message });
    } finally {
      window.clearInterval(timer);
    }
  }

  async function approveAndFinish() {
    if (!jobId || !photo || !character || !scene || !user) return;
    setStatus("aprobado");
    await supabase.from("ai_generation_jobs").update({ status: "aprobado" }).eq("id", jobId);

    setStatus("generando_final");
    setProgress(20);
    const timer = window.setInterval(() => setProgress((p) => Math.min(p + 5, 90)), 400);
    try {
      const prompt = buildInternalPrompt({
        outputType,
        characterName: character.name,
        characterDescription: character.description,
        sceneTemplate: scene.prompt_template,
        background,
        style,
        peopleCount: photo.peopleCount,
        action: outputType === "video" ? action : null,
        durationSeconds: outputType === "video" ? duration : null,
        extraInstruction: extra,
      });

      const characterUrl = await toDataUrl(characterImage(character));
      const result = await generate({
        data: {
          prompt,
          customerImageUrl: photo.dataUrl,
          characterImageUrl: characterUrl,
          aspectRatio,
          quality: "final",
          outputType,
          durationSeconds: outputType === "video" ? duration : undefined,
          action: outputType === "video" ? action : undefined,
        },
      });

      const media = result.mediaUrl ?? result.posterUrl ?? previewUrl;
      if (!media) throw new Error("El proveedor no devolvió contenido");
      const finalPath = `${user.id}/finales/${jobId}.jpg`;
      await upload(finalPath, media, "image/jpeg");

      setFinalUrl(media);
      setSimulated(result.simulated);
      setStatus("completado");
      setProgress(100);
      await supabase
        .from("ai_generation_jobs")
        .update({
          status: "completado",
          progress: 100,
          final_output_path: finalPath,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      toast.success("Recuerdo listo para entregar");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      setErrorMessage(message);
      setStatus("error");
      await supabase.from("ai_generation_jobs").update({ status: "error", error_message: message }).eq("id", jobId);
      toast.error("No pudimos generar el archivo final", { description: message });
    } finally {
      window.clearInterval(timer);
    }
  }

  const displayed = finalUrl ?? previewUrl;
  const showWatermark = !!previewUrl && !finalUrl;

  const stepsDone = useMemo(
    () => [!!outputType, !!photo, !!character, !!scene && consent].filter(Boolean).length,
    [outputType, photo, character, scene, consent],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Crear recuerdo mágico con IA
          </DialogTitle>
          <DialogDescription>
            Paso {stepsDone} de 4 · elegí el formato, cargá la foto del cliente y combinala con un personaje aprobado.
          </DialogDescription>
        </DialogHeader>

        {/* Selector de formato */}
        <div className="grid grid-cols-2 gap-3">
          {(["imagen", "video"] as OutputType[]).map((type) => (
            <button
              key={type}
              type="button"
              disabled={busy}
              onClick={() => {
                setOutputType(type);
                resetJob();
              }}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-border p-4 text-left transition-all hover:border-primary disabled:opacity-60",
                outputType === type && "border-primary bg-primary/5 ring-2 ring-primary/20",
              )}
            >
              {type === "imagen" ? (
                <ImageIcon className="h-6 w-6 text-primary" />
              ) : (
                <Video className="h-6 w-6 text-primary" />
              )}
              <span>
                <span className="block font-medium">{type === "imagen" ? "Crear foto" : "Crear video"}</span>
                <span className="block text-xs text-muted-foreground">
                  {type === "imagen"
                    ? "Composición fija lista para imprimir"
                    : "Animación corta de 5 a 10 segundos"}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr_360px]">
          {/* Paso 2 */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              2 · Foto del cliente
            </h3>
            <CustomerPhotoStep value={photo} aspectRatio={aspectRatio} onChange={setPhoto} />
          </section>

          {/* Paso 3 y 4 */}
          <section className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">3 · Personaje</h3>
              <CharacterLibrary
                characters={characters}
                outputType={outputType}
                selectedId={character?.id ?? null}
                onSelect={setCharacter}
                locationOptions={locations}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">4 · Escena</h3>
              <div className="grid grid-cols-2 gap-2">
                {sceneOptions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSceneId(s.id)}
                    className={cn(
                      "rounded-lg border border-border p-2.5 text-left text-sm transition-colors hover:border-primary",
                      sceneId === s.id && "border-primary bg-primary/5",
                    )}
                  >
                    <span className="block font-medium">{s.name}</span>
                    <span className="line-clamp-1 block text-xs text-muted-foreground">{s.description ?? ""}</span>
                  </button>
                ))}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <LabeledSelect label="Fondo" value={background} onChange={setBackground} options={BACKGROUNDS} />
                <LabeledSelect label="Estilo" value={style} onChange={setStyle} options={VISUAL_STYLES} />
                <LabeledSelect label="Formato" value={aspectRatio} onChange={setAspectRatio} options={ASPECT_RATIOS} />
                {outputType === "video" && (
                  <>
                    <LabeledSelect label="Acción" value={action} onChange={setAction} options={VIDEO_ACTIONS} />
                    <LabeledSelect
                      label="Duración"
                      value={String(duration)}
                      onChange={(v) => setDuration(Number(v))}
                      options={VIDEO_DURATIONS.map((d) => ({ value: String(d), label: `${d} segundos` }))}
                    />
                  </>
                )}
              </div>

              {scene?.code === "personalizada" && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Detalle de la escena personalizada</p>
                  <Input
                    value={extra}
                    onChange={(e) => setExtra(e.target.value)}
                    maxLength={200}
                    placeholder="Ej.: el personaje entrega un globo al cliente"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Resultado */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Resultado</h3>
              <Badge className={cn("border-0", JOB_STATUS_TONE[status])}>{JOB_STATUS_LABEL[status]}</Badge>
            </div>

            <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
              {displayed ? (
                <>
                  <img
                    src={displayed}
                    alt="Recuerdo generado"
                    className={cn("h-full w-full object-cover", showWatermark && "blur-[1px]")}
                  />
                  {showWatermark && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg font-semibold tracking-[0.3em] text-background/80 mix-blend-overlay">
                      FTG · MUESTRA
                    </span>
                  )}
                  {outputType === "video" && (
                    <span className="absolute bottom-2 left-2 rounded-md bg-background/85 px-2 py-1 text-[11px]">
                      Video simulado · {duration}s · {VIDEO_ACTIONS.find((a) => a.value === action)?.label}
                    </span>
                  )}
                </>
              ) : busy ? (
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              ) : (
                <p className="px-6 text-center text-xs text-muted-foreground">
                  Completá los pasos y generá la vista previa con marca de agua.
                </p>
              )}
            </div>

            {(busy || status === "preview_listo" || status === "completado") && (
              <div className="space-y-1">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground">{JOB_STATUS_MESSAGE[status]}</p>
              </div>
            )}

            {status === "error" && (
              <p className="flex items-start gap-1.5 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {errorMessage}
              </p>
            )}

            {simulated && (
              <p className="rounded-lg bg-muted p-2 text-xs text-muted-foreground">
                Generación simulada para el MVP: el proveedor real de video se conecta desde el backend sin tocar la interfaz.
              </p>
            )}

            <Separator />

            {/* Consentimiento */}
            <div className="space-y-2 rounded-lg border border-border p-3">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Consentimiento del cliente
              </p>
              <label className="flex items-start gap-2 text-xs">
                <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                <span>
                  El cliente autoriza el uso de su imagen para generar este recuerdo. Se guarda de forma privada y se
                  elimina a los 30 días.
                </span>
              </label>
              <label className="flex items-start gap-2 text-xs">
                <Checkbox checked={minor} onCheckedChange={(v) => setMinor(v === true)} className="mt-0.5" />
                <span>La foto incluye a un menor de edad</span>
              </label>
              {minor && (
                <label className="flex items-start gap-2 text-xs">
                  <Checkbox checked={guardian} onCheckedChange={(v) => setGuardian(v === true)} className="mt-0.5" />
                  <span>Confirmo que el padre, madre o tutor autorizó la generación</span>
                </label>
              )}
            </div>

            <div className="space-y-2">
              {status !== "completado" && (
                <Button className="w-full" disabled={!canGenerate} onClick={() => void startPreview()}>
                  {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                  {previewUrl ? "Regenerar vista previa" : "Generar vista previa"}
                </Button>
              )}

              {status === "preview_listo" && (
                <Button className="w-full" variant="secondary" onClick={() => void approveAndFinish()}>
                  <Check className="mr-1.5 h-4 w-4" /> Aprobar y generar final
                </Button>
              )}

              {status === "error" && (
                <Button className="w-full" variant="secondary" onClick={() => void startPreview()}>
                  <RefreshCw className="mr-1.5 h-4 w-4" /> Reintentar
                </Button>
              )}

              {status === "completado" && finalUrl && (
                <>
                  <Button className="w-full" variant="secondary" asChild>
                    <a href={finalUrl} download={`recuerdo-${jobId}.jpg`}>
                      <Download className="mr-1.5 h-4 w-4" /> Descargar sin marca de agua
                    </a>
                  </Button>
                  <Button
                    className="w-full"
                    onClick={() => {
                      onAddToCart?.({
                        outputType,
                        jobId: jobId!,
                        price: pricing.price,
                        label: pricing.product,
                      });
                      onOpenChange(false);
                    }}
                  >
                    <ShoppingCart className="mr-1.5 h-4 w-4" /> Enviar al punto de venta
                  </Button>
                </>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
