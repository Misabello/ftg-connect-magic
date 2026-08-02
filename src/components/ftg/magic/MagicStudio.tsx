import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  Check,
  Download,
  Image as ImageIcon,
  Loader2,
  Mail,
  MessageCircle,
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
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import {
  buildVideoComposition,
  runImageGeneration,
  runVideoGeneration,
} from "@/lib/ftg/magic.functions";
import {
  buildFinalVideoPrompt,
  MAX_USER_PROMPT,
  NEGATIVE_PROMPT,
  PROMPT_TEMPLATE_VERSION,
  VIDEO_MOTION_TEMPLATES,
} from "@/lib/ftg/magic.prompts";
import {
  ASPECT_RATIOS,
  BACKGROUNDS,
  JOB_STATUS_LABEL,
  JOB_STATUS_MESSAGE,
  JOB_STATUS_TONE,
  PRICING,
  PROMPT_VERSION,
  VIDEO_DURATIONS,
  VISUAL_STYLES,
  buildInternalPrompt,
  dataUrlToBlob,
  type JobStatus,
  type OutputType,
} from "@/lib/ftg/magic";
import { CharacterLibrary, characterImage, type CharacterRow } from "./CharacterLibrary";
import { CompositionStep, type GapLevel } from "./CompositionStep";
import { CustomerPhotoStep, type CustomerPhoto } from "./CustomerPhotoStep";
import { VideoPromptPanel } from "./VideoPromptPanel";
import { addMagicItem } from "@/lib/ftg/magic-cart";
import { buildSouvenirMessage, mailtoLink, whatsappLink } from "@/lib/ftg/share";

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
  const { user, profile } = useAuth();
  const { language } = useI18n();

  const [outputType, setOutputType] = useState<OutputType>("imagen");
  const [photo, setPhoto] = useState<CustomerPhoto | null>(null);
  const [character, setCharacter] = useState<CharacterRow | null>(null);
  const [sceneId, setSceneId] = useState<string | null>(null);
  const [background, setBackground] = useState("parque");
  const [style, setStyle] = useState("realista");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [motion, setMotion] = useState<string>("abrazo");
  const [duration, setDuration] = useState(5);
  const [engine, setEngine] = useState<"estandar" | "abrazo" | "economico">("abrazo");
  const [minResolution, setMinResolution] = useState<"720p" | "1080p">("720p");
  const [userPrompt, setUserPrompt] = useState("");
  const [extra, setExtra] = useState("");
  const [consent, setConsent] = useState(false);
  const [guardian, setGuardian] = useState(false);
  const [minor, setMinor] = useState(false);

  // Composición inicial (solo video)
  const [personSide, setPersonSide] = useState<"izquierda" | "derecha">("izquierda");
  const [gapLevel, setGapLevel] = useState<GapLevel>("media");
  const [characterScale, setCharacterScale] = useState(1);
  const [compositionUrl, setCompositionUrl] = useState<string | null>(null);
  const [compositionApproved, setCompositionApproved] = useState(false);
  const [compositionBusy, setCompositionBusy] = useState(false);

  const [status, setStatus] = useState<JobStatus>("pendiente");
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [finalUrl, setFinalUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoMeta, setVideoMeta] = useState<{ mime: string; seconds: number; width: number; height: number } | null>(
    null,
  );
  const [videoApproved, setVideoApproved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const generateImage = useServerFn(runImageGeneration);
  const generateComposition = useServerFn(buildVideoComposition);
  const generateVideo = useServerFn(runVideoGeneration);

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
    setUserPrompt("");
    setConsent(false);
    setGuardian(false);
    setMinor(false);
    setCustomerEmail("");
    setCustomerPhone("");
    resetComposition();
    resetJob();
  }

  function resetComposition() {
    setCompositionUrl(null);
    setCompositionApproved(false);
    setCompositionBusy(false);
  }

  /**
   * Cambiar fondo, estilo, formato o personaje invalida la composición y
   * también el video ya generado: se vuelve al estado inicial para poder
   * generar de nuevo desde la columna de resultado.
   */
  function restartFromComposition() {
    resetComposition();
    resetJob();
  }

  function resetJob() {
    setStatus("pendiente");
    setProgress(0);
    setJobId(null);
    setPreviewUrl(null);
    setFinalUrl(null);
    setVideoUrl(null);
    setVideoMeta(null);
    setVideoApproved(false);
    setErrorMessage(null);
  }

  const busy =
    status === "en_cola" || status === "procesando" || status === "generando_preview" || status === "generando_final";

  const baseReady = !!photo && !!character && !!scene && consent && (!minor || guardian) && !busy && !!user;
  const canGenerate = outputType === "imagen" ? baseReady : baseReady && compositionApproved;

  const pricing = PRICING[outputType];

  const finalPromptPreview = useMemo(
    () => buildFinalVideoPrompt({ motion, userPrompt, durationSeconds: duration, aspectRatio }),
    [motion, userPrompt, duration, aspectRatio],
  );

  async function upload(path: string, body: Blob, contentType: string) {
    const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType, upsert: true });
    if (error) throw error;
    return path;
  }

  async function signedUrl(path: string) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
    return data?.signedUrl ?? null;
  }

  async function toDataUrl(src: string) {
    const res = await fetch(src);
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });
  }

  /** Lee duración y resolución reales del archivo generado y arma la miniatura. */
  async function probeVideo(url: string) {
    return await new Promise<{ seconds: number; width: number; height: number; thumbnail: string | null }>(
      (resolve) => {
        const el = document.createElement("video");
        el.preload = "metadata";
        el.muted = true;
        el.crossOrigin = "anonymous";
        el.onloadeddata = () => {
          let thumbnail: string | null = null;
          try {
            const canvas = document.createElement("canvas");
            canvas.width = el.videoWidth;
            canvas.height = el.videoHeight;
            canvas.getContext("2d")?.drawImage(el, 0, 0);
            thumbnail = canvas.toDataURL("image/jpeg", 0.8);
          } catch {
            thumbnail = null;
          }
          resolve({ seconds: el.duration || 0, width: el.videoWidth, height: el.videoHeight, thumbnail });
        };
        el.onerror = () => resolve({ seconds: 0, width: 0, height: 0, thumbnail: null });
        el.src = url;
      },
    );
  }

  async function ensureJob(mediaPath: string) {
    if (!user || !character || !scene) throw new Error("Faltan datos del trabajo");
    if (jobId) return jobId;

    const { data: job, error } = await supabase
      .from("ai_generation_jobs")
      .insert({
        organization_id: organizationId,
        location_id: locationId,
        point_of_sale_id: pointOfSaleId ?? null,
        output_type: outputType,
        customer_media_path: mediaPath,
        character_id: character.id,
        scene_id: scene.id,
        action: outputType === "video" ? motion : null,
        aspect_ratio: aspectRatio,
        duration_seconds: outputType === "video" ? duration : null,
        style,
        people_count: photo?.peopleCount ?? 1,
        extra_instruction: extra || null,
        status: "procesando",
        progress: 10,
        provider: outputType === "video" ? "fal-ai" : "lovable-ai",
        prompt_version: outputType === "video" ? PROMPT_TEMPLATE_VERSION : PROMPT_VERSION,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error) throw error;

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

    setJobId(job.id);
    return job.id as string;
  }

  async function uploadCustomerPhoto() {
    if (!photo || !user) throw new Error("Falta la foto del cliente");
    const mediaPath = `${user.id}/${crypto.randomUUID()}.jpg`;
    await upload(mediaPath, dataUrlToBlob(photo.dataUrl), "image/jpeg");
    return mediaPath;
  }

  /* ───────────── Modo foto ───────────── */

  async function runImageFlow(quality: "preview" | "final") {
    if (!photo || !character || !scene || !user) return;
    setErrorMessage(null);
    setStatus(quality === "preview" ? "generando_preview" : "generando_final");
    setProgress(15);
    const timer = window.setInterval(() => setProgress((p) => Math.min(p + 4, 90)), 500);
    let currentJob = jobId;
    try {
      const mediaPath = await uploadCustomerPhoto();
      currentJob = await ensureJob(mediaPath);

      const prompt = buildInternalPrompt({
        outputType: "imagen",
        characterName: character.name,
        characterDescription: character.description,
        sceneTemplate: scene.prompt_template,
        background,
        style,
        peopleCount: photo.peopleCount,
        extraInstruction: extra,
      });

      const result = await generateImage({
        data: {
          prompt,
          customerImageUrl: photo.dataUrl,
          characterImageUrl: await toDataUrl(characterImage(character)),
          aspectRatio,
          quality,
        },
      });

      const path = `${user.id}/${quality === "preview" ? "previews" : "finales"}/${currentJob}.jpg`;
      await upload(path, dataUrlToBlob(result.imageUrl), "image/jpeg");

      if (quality === "preview") {
        setPreviewUrl(result.imageUrl);
        setStatus("preview_listo");
      } else {
        setFinalUrl(result.imageUrl);
        setStatus("completado");
      }
      setProgress(100);

      await supabase
        .from("ai_generation_jobs")
        .update({
          status: quality === "preview" ? "preview_listo" : "completado",
          progress: 100,
          prompt_used: prompt,
          final_prompt: prompt,
          model: result.model,
          provider: result.provider,
          output_mime_type: "image/jpeg",
          estimated_cost: result.estimatedCost,
          ...(quality === "preview" ? { preview_path: path } : { final_output_path: path, completed_at: new Date().toISOString() }),
        })
        .eq("id", currentJob);
    } catch (error) {
      await failJob(currentJob, error);
    } finally {
      window.clearInterval(timer);
    }
  }

  /* ───────────── Modo video ───────────── */

  async function runComposition() {
    if (!photo || !character) return;
    setCompositionBusy(true);
    setCompositionApproved(false);
    setErrorMessage(null);
    try {
      const result = await generateComposition({
        data: {
          customerImageUrl: photo.dataUrl,
          characterImageUrl: await toDataUrl(characterImage(character)),
          characterName: character.name,
          characterDescription: character.description,
          background,
          style,
          aspectRatio: aspectRatio as "9:16" | "1:1" | "16:9",
          personSide,
          gapLevel,
          characterScale,
        },
      });
      setCompositionUrl(result.compositionUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      setErrorMessage(message);
      toast.error("No pudimos armar la composición", { description: message });
    } finally {
      setCompositionBusy(false);
    }
  }

  async function approveComposition() {
    if (!compositionUrl || !user) return;
    setCompositionApproved(true);
    try {
      const mediaPath = await uploadCustomerPhoto();
      const job = await ensureJob(mediaPath);
      const path = `${user.id}/composiciones/${job}.jpg`;
      await upload(path, dataUrlToBlob(compositionUrl), "image/jpeg");
      await supabase
        .from("ai_generation_jobs")
        .update({ composition_path: path, composition_approved: true })
        .eq("id", job);
      toast.success("Composición aprobada");
    } catch (error) {
      toast.error("No pudimos guardar la composición", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function runVideoFlow() {
    if (!photo || !character || !compositionUrl || !user) return;
    if (!compositionApproved) {
      toast.error("Aprobá la composición inicial antes de generar el video");
      return;
    }
    setErrorMessage(null);
    setStatus("en_cola");
    setProgress(10);
    const timer = window.setInterval(() => setProgress((p) => Math.min(p + 2, 90)), 1500);
    let currentJob = jobId;
    try {
      const mediaPath = await uploadCustomerPhoto();
      currentJob = await ensureJob(mediaPath);
      setStatus("procesando");

      const result = await generateVideo({
        data: {
          compositionImageUrl: compositionUrl,
          customerImageUrl: photo.dataUrl,
          characterImageUrl: await toDataUrl(characterImage(character)),
          motion,
          userPrompt: userPrompt || null,
          aspectRatio: aspectRatio as "9:16" | "1:1" | "16:9",
          durationSeconds: duration,
          minResolution,
          engine,
        },
      });

      const response = await fetch(result.videoUrl);
      const blob = await response.blob();
      const mime = (blob.type || result.mimeType).split(";")[0]!;
      if (!["video/mp4", "video/webm"].includes(mime)) {
        throw new Error(`El proveedor devolvió un archivo que no es video (${mime || "desconocido"}).`);
      }

      const extension = mime === "video/webm" ? "webm" : "mp4";
      const videoPath = `${user.id}/videos/${currentJob}.${extension}`;
      await upload(videoPath, blob, mime);

      const playable = (await signedUrl(videoPath)) ?? URL.createObjectURL(blob);
      const probe = await probeVideo(playable);

      let thumbnailPath: string | null = null;
      if (probe.thumbnail) {
        thumbnailPath = `${user.id}/videos/${currentJob}-thumb.jpg`;
        await upload(thumbnailPath, dataUrlToBlob(probe.thumbnail), "image/jpeg");
      }

      setVideoUrl(playable);
      setVideoMeta({ mime, seconds: probe.seconds, width: probe.width, height: probe.height });
      setStatus("completado");
      setProgress(100);

      await supabase
        .from("ai_generation_jobs")
        .update({
          status: "completado",
          progress: 100,
          provider: result.provider,
          provider_job_id: result.providerJobId,
          model: result.model,
          user_prompt: result.userPrompt || null,
          final_prompt: result.finalPrompt,
          prompt_used: result.finalPrompt,
          negative_prompt: result.negativePrompt,
          prompt_version: result.promptVersion,
          provider_params: result.params,
          output_mime_type: mime,
          video_path: videoPath,
          final_output_path: videoPath,
          thumbnail_path: thumbnailPath,
          output_width: probe.width,
          output_height: probe.height,
          estimated_cost: result.estimatedCost,
          completed_at: new Date().toISOString(),
        })
        .eq("id", currentJob);

      toast.success("Video listo para revisar");
    } catch (error) {
      await failJob(currentJob, error);
    } finally {
      window.clearInterval(timer);
    }
  }

  async function failJob(currentJob: string | null, error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    setErrorMessage(message);
    setStatus("error");
    setProgress(0);
    if (currentJob) {
      await supabase.from("ai_generation_jobs").update({ status: "error", error_message: message }).eq("id", currentJob);
    }
    toast.error("No pudimos generar el recuerdo", { description: message });
  }

  const displayedImage = finalUrl ?? previewUrl;
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

        <div className="grid grid-cols-2 gap-3">
          {(["imagen", "video"] as OutputType[]).map((type) => (
            <button
              key={type}
              type="button"
              disabled={busy}
              onClick={() => {
                setOutputType(type);
                resetComposition();
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
                  {type === "imagen" ? "Composición fija lista para imprimir" : "Animación real de 5 a 10 segundos"}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr_360px]">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              2 · Foto del cliente
            </h3>
            <CustomerPhotoStep value={photo} aspectRatio={aspectRatio} onChange={setPhoto} />
          </section>

          <section className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">3 · Personaje</h3>
              <CharacterLibrary
                characters={characters}
                outputType={outputType}
                selectedId={character?.id ?? null}
                onSelect={(c) => {
                  setCharacter(c);
                  restartFromComposition();
                }}
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
                <LabeledSelect label="Fondo" value={background} onChange={(v) => { setBackground(v); restartFromComposition(); }} options={BACKGROUNDS} />
                <LabeledSelect label="Estilo" value={style} onChange={(v) => { setStyle(v); restartFromComposition(); }} options={VISUAL_STYLES} />
                <LabeledSelect label="Formato" value={aspectRatio} onChange={(v) => { setAspectRatio(v); restartFromComposition(); }} options={ASPECT_RATIOS} />
                {outputType === "video" && (
                  <>
                    <LabeledSelect
                      label="Movimiento"
                      value={motion}
                      onChange={setMotion}
                      options={VIDEO_MOTION_TEMPLATES.map((m) => ({ value: m.value, label: m.label }))}
                    />
                    <LabeledSelect
                      label="Motor de video"
                      value={engine}
                      onChange={(v) => setEngine(v as "estandar" | "abrazo" | "economico")}
                      options={[
                        { value: "estandar", label: "Estándar (6 s · 768p)" },
                        { value: "abrazo", label: "Abrazo (plantilla hug)" },
                        { value: "economico", label: "Económico (720p)" },
                      ]}
                    />
                    <LabeledSelect
                      label="Duración"
                      value={String(duration)}
                      onChange={(v) => setDuration(Number(v))}
                      options={VIDEO_DURATIONS.map((d) => ({ value: String(d), label: `${d} segundos` }))}
                    />
                    <LabeledSelect
                      label="Resolución mínima"
                      value={minResolution}
                      onChange={(v) => setMinResolution(v as "720p" | "1080p")}
                      options={[
                        { value: "720p", label: "720p" },
                        { value: "1080p", label: "1080p" },
                      ]}
                    />
                  </>
                )}
              </div>

              {scene?.code === "personalizada" && outputType === "imagen" && (
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

              {outputType === "video" && (
                <>
                  <CompositionStep
                    url={compositionUrl}
                    busy={compositionBusy}
                    approved={compositionApproved}
                    personSide={personSide}
                    gapLevel={gapLevel}
                    characterScale={characterScale}
                    onSwapSides={() => {
                      setPersonSide((s) => (s === "izquierda" ? "derecha" : "izquierda"));
                      setCompositionApproved(false);
                      resetJob();
                    }}
                    onGapChange={(g) => {
                      setGapLevel(g);
                      setCompositionApproved(false);
                      resetJob();
                    }}
                    onScaleChange={(v) => {
                      setCharacterScale(v);
                      setCompositionApproved(false);
                      resetJob();
                    }}
                    onGenerate={() => void runComposition()}
                    onApprove={() => void approveComposition()}
                  />
                  <VideoPromptPanel
                    value={userPrompt}
                    onChange={(v) => setUserPrompt(v.slice(0, MAX_USER_PROMPT))}
                    finalPrompt={finalPromptPreview}
                    language={language === "pt" ? "pt" : "es"}
                  />
                </>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Resultado</h3>
              <Badge className={cn("border-0", JOB_STATUS_TONE[status])}>{JOB_STATUS_LABEL[status]}</Badge>
            </div>

            <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
              {outputType === "video" && videoUrl ? (
                <video src={videoUrl} controls playsInline className="h-full w-full object-contain" />
              ) : outputType === "imagen" && displayedImage ? (
                <>
                  <img
                    src={displayedImage}
                    alt="Recuerdo generado"
                    className={cn("h-full w-full object-cover", showWatermark && "blur-[1px]")}
                  />
                  {showWatermark && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg font-semibold tracking-[0.3em] text-background/80 mix-blend-overlay">
                      FTG · MUESTRA
                    </span>
                  )}
                </>
              ) : busy ? (
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              ) : (
                <p className="px-6 text-center text-xs text-muted-foreground">
                  {outputType === "video"
                    ? "Aprobá la composición inicial y generá el video."
                    : "Completá los pasos y generá la vista previa con marca de agua."}
                </p>
              )}
            </div>

            {videoMeta && (
              <p className="rounded-lg bg-muted p-2 text-xs text-muted-foreground">
                {videoMeta.mime} · {videoMeta.seconds ? `${videoMeta.seconds.toFixed(1)}s` : "duración desconocida"} ·{" "}
                {videoMeta.width}×{videoMeta.height}
              </p>
            )}

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

            <Separator />

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
              {outputType === "imagen" ? (
                <>
                  {status !== "completado" && (
                    <Button className="w-full" disabled={!canGenerate} onClick={() => void runImageFlow("preview")}>
                      {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                      {previewUrl ? "Regenerar vista previa" : "Generar vista previa"}
                    </Button>
                  )}
                  {status === "preview_listo" && (
                    <Button className="w-full" variant="secondary" onClick={() => void runImageFlow("final")}>
                      <Check className="mr-1.5 h-4 w-4" /> Aprobar y generar final
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {status !== "completado" && (
                    <Button className="w-full" disabled={!canGenerate} onClick={() => void runVideoFlow()}>
                      {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Video className="mr-1.5 h-4 w-4" />}
                      Generar video
                    </Button>
                  )}
                  {status === "completado" && videoUrl && !videoApproved && (
                    <div className="flex gap-2">
                      <Button className="flex-1" variant="secondary" onClick={() => void runVideoFlow()}>
                        <RefreshCw className="mr-1.5 h-4 w-4" /> Regenerar
                      </Button>
                      <Button className="flex-1" onClick={() => setVideoApproved(true)}>
                        <Check className="mr-1.5 h-4 w-4" /> Aprobar
                      </Button>
                    </div>
                  )}
                </>
              )}

              {status === "error" && (
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => void (outputType === "video" ? runVideoFlow() : runImageFlow("preview"))}
                >
                  <RefreshCw className="mr-1.5 h-4 w-4" /> Reintentar
                </Button>
              )}

              {status === "completado" && (outputType === "imagen" ? !!finalUrl : videoApproved) && (
                <>
                  <div className="space-y-2 rounded-lg border border-border p-3">
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Entrega al cliente
                    </p>
                    <Input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="Email del cliente"
                      className="h-9"
                    />
                    <Input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="WhatsApp del cliente (con código de país)"
                      className="h-9"
                    />
                    <div className="flex gap-2">
                      <Button className="flex-1" size="sm" variant="outline" asChild>
                        <a
                          href={mailtoLink(
                            customerEmail,
                            `Tu ${pricing.product} de FTG`,
                            buildSouvenirMessage({
                              label: pricing.product,
                              sellerName: profile?.full_name,
                              sellerPhone: profile?.phone,
                            }),
                          )}
                        >
                          <Mail className="mr-1.5 h-4 w-4" /> Email
                        </a>
                      </Button>
                      <Button className="flex-1" size="sm" variant="outline" asChild>
                        <a
                          href={whatsappLink(
                            customerPhone,
                            buildSouvenirMessage({
                              label: pricing.product,
                              sellerName: profile?.full_name,
                              sellerPhone: profile?.phone,
                            }),
                          )}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
                        </a>
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      El archivo se descarga desde este equipo y se adjunta al mensaje.
                    </p>
                  </div>

                  <Button className="w-full" variant="secondary" asChild>
                    <a
                      href={(outputType === "video" ? videoUrl : finalUrl) ?? "#"}
                      download={`recuerdo-${jobId}.${outputType === "video" ? (videoMeta?.mime === "video/webm" ? "webm" : "mp4") : "jpg"}`}
                    >
                      <Download className="mr-1.5 h-4 w-4" /> Descargar sin marca de agua
                    </a>
                  </Button>
                  <Button
                    className="w-full"
                    onClick={() => {
                      addMagicItem({
                        jobId: jobId!,
                        outputType,
                        label: pricing.product,
                        price: pricing.price,
                        locationId,
                        mediaUrl: (outputType === "video" ? videoUrl : finalUrl) ?? null,
                        customerEmail: customerEmail || null,
                        customerPhone: customerPhone || null,
                      });
                      onAddToCart?.({
                        outputType,
                        jobId: jobId!,
                        price: pricing.price,
                        label: pricing.product,
                      });
                      onOpenChange(false);
                    }}
                  >
                    <ShoppingCart className="mr-1.5 h-4 w-4" /> Enviar al carrito del punto de venta
                  </Button>
                </>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground">
              Prompt negativo interno activo ({NEGATIVE_PROMPT.split(",").length} reglas) para evitar figuras
              superpuestas o duplicadas.
            </p>
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
