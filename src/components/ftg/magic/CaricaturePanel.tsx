import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  Check,
  Download,
  Loader2,
  RefreshCw,
  ScanFace,
  ShoppingCart,
  Sparkles,
  Trash2,
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/ftg/format";
import { addMagicItem, openCartDock } from "@/lib/ftg/magic-cart";
import { dataUrlToBlob } from "@/lib/ftg/magic";
import { detectPhotoFaces, runCaricatureGeneration } from "@/lib/ftg/caricature.functions";
import {
  CARICATURE_BACKGROUNDS,
  CARICATURE_PROMPT_VERSION,
  CARICATURE_STYLES,
  MAX_CARICATURE_NOTE,
  buildCaricaturePrompt,
  caricatureCost,
  caricaturePrice,
  type DetectedFace,
} from "@/lib/ftg/caricature";
import type { CustomerPhoto } from "./CustomerPhotoStep";

const BUCKET = "customer-media";

export const CARICATURE_CONSENT_TEXT =
  "Confirmo que las personas fotografiadas, o sus responsables cuando corresponda, autorizaron el uso de su imagen para crear este recuerdo.";

export function CaricaturePanel({
  photo,
  locationId,
  organizationId,
  pointOfSaleId,
  onAddToCart,
}: {
  photo: CustomerPhoto | null;
  locationId: string | null;
  organizationId: string | null;
  pointOfSaleId?: string | null;
  onAddToCart?: ((item: { outputType: "imagen"; jobId: string; price: number; label: string }) => void) | undefined;
}) {
  const { user } = useAuth();
  const detect = useServerFn(detectPhotoFaces);
  const generate = useServerFn(runCaricatureGeneration);

  const [faces, setFaces] = useState<DetectedFace[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [detectionDone, setDetectionDone] = useState(false);
  const [style, setStyle] = useState<string>("caricatura_3d");
  const [background, setBackground] = useState<string>("original");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [guardian, setGuardian] = useState(false);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [finalUrl, setFinalUrl] = useState<string | null>(null);
  const [deliveryPath, setDeliveryPath] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [added, setAdded] = useState(false);

  /** Cambiar de fotografía reinicia la detección y el resultado. */
  useEffect(() => {
    setFaces([]);
    setDetectionDone(false);
    resetResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo?.dataUrl]);

  function resetResult() {
    setPreviewUrl(null);
    setFinalUrl(null);
    setDeliveryPath(null);
    setJobId(null);
    setErrorMessage(null);
    setProgress(0);
    setAdded(false);
  }

  const selected = faces.filter((f) => f.selected);
  const hasMinor = faces.some((f) => f.minor && f.selected);
  const price = caricaturePrice(selected.length);
  const estimatedCost = caricatureCost(Math.max(selected.length, 1), previewUrl ? "final" : "preview");

  const promptPreview = useMemo(
    () =>
      faces.length > 0
        ? buildCaricaturePrompt({ faces, style, background, note, quality: "preview" })
        : "",
    [faces, style, background, note],
  );

  const canGenerate =
    !!photo && selected.length > 0 && consent && (!hasMinor || guardian) && !busy && !!user;

  async function runDetection() {
    if (!photo) return;
    setDetecting(true);
    setErrorMessage(null);
    try {
      const result = await detect({ data: { imageUrl: photo.dataUrl } });
      if (result.faces.length === 0) {
        toast.warning("No detectamos rostros", { description: "Probá con una foto más nítida o con las caras visibles." });
      }
      setFaces(result.faces);
      setDetectionDone(true);
      resetResult();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      setErrorMessage(message);
      toast.error("No pudimos analizar la fotografía", { description: message });
    } finally {
      setDetecting(false);
    }
  }

  function toggleFace(id: string) {
    setFaces((prev) => prev.map((f) => (f.id === id ? { ...f, selected: !f.selected } : f)));
    resetResult();
  }

  async function upload(path: string, dataUrl: string) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, dataUrlToBlob(dataUrl), { contentType: "image/jpeg", upsert: true });
    if (error) throw error;
    return path;
  }

  /** Crea el registro del trabajo con la fotografía original y el consentimiento. */
  async function ensureJob(sourcePath: string) {
    if (jobId) return jobId;
    if (!user) throw new Error("Sesión no disponible");

    const { data: job, error } = await supabase
      .from("ai_generation_jobs")
      .insert({
        organization_id: organizationId,
        location_id: locationId,
        point_of_sale_id: pointOfSaleId ?? null,
        output_type: "imagen",
        customer_media_path: sourcePath,
        aspect_ratio: "1:1",
        style,
        people_count: faces.length,
        extra_instruction: note || null,
        status: "procesando",
        progress: 10,
        provider: "lovable-ai",
        prompt_version: CARICATURE_PROMPT_VERSION,
        provider_params: {
          feature: "caricatura_grupal",
          background,
          faces_detected: faces.length,
          faces_selected: selected.map((f) => f.id),
          faces: faces.map((f) => ({
            id: f.id,
            selected: f.selected,
            minor: f.minor,
            box: f.box,
            position: f.position,
          })),
        },
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error) throw error;

    await supabase.from("customer_consents").insert({
      organization_id: organizationId,
      location_id: locationId,
      job_id: job.id,
      customer_media_path: sourcePath,
      consent_type: hasMinor ? "menor_con_tutor" : "titular",
      guardian_confirmation: hasMinor ? guardian : false,
      purpose: "Caricaturización de todas las personas de la fotografía y entrega al cliente",
      retention_policy: "Se elimina a los 30 días salvo pedido del cliente",
      device_label: navigator.userAgent.slice(0, 120),
      accepted_by: user.id,
    });

    setJobId(job.id);
    return job.id as string;
  }

  async function run(quality: "preview" | "final") {
    if (!photo || !user) return;
    setBusy(true);
    setErrorMessage(null);
    setProgress(15);
    const timer = window.setInterval(() => setProgress((p) => Math.min(p + 4, 90)), 500);
    let currentJob = jobId;
    try {
      const sourcePath = currentJob
        ? `${user.id}/caricaturas/${currentJob}-original.jpg`
        : `${user.id}/${crypto.randomUUID()}.jpg`;
      if (!currentJob) await upload(sourcePath, photo.dataUrl);
      currentJob = await ensureJob(sourcePath);

      const result = await generate({
        data: {
          imageUrl: photo.dataUrl,
          faces: faces.map((f) => ({
            id: f.id,
            label: f.label,
            description: f.description,
            position: f.position,
            selected: f.selected,
          })),
          style,
          background,
          note: note || null,
          aspectRatio: "1:1",
          quality,
        },
      });

      const path = `${user.id}/caricaturas/${currentJob}-${quality === "preview" ? "preview" : "final"}.jpg`;
      await upload(path, result.imageUrl);

      if (quality === "preview") {
        setPreviewUrl(result.imageUrl);
      } else {
        setFinalUrl(result.imageUrl);
        setDeliveryPath(path);
      }
      setProgress(100);

      await supabase
        .from("ai_generation_jobs")
        .update({
          status: quality === "preview" ? "preview_listo" : "completado",
          progress: 100,
          prompt_used: result.prompt,
          final_prompt: result.prompt,
          negative_prompt: result.negativePrompt,
          prompt_version: result.promptVersion,
          model: result.model,
          provider: result.provider,
          output_mime_type: "image/jpeg",
          estimated_cost: result.estimatedCost,
          ...(quality === "preview"
            ? { preview_path: path }
            : { final_output_path: path, completed_at: new Date().toISOString() }),
        })
        .eq("id", currentJob);

      toast.success(quality === "preview" ? "Vista previa lista" : "Caricatura final aprobada");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      setErrorMessage(message);
      setProgress(0);
      if (currentJob) {
        await supabase
          .from("ai_generation_jobs")
          .update({ status: "error", error_message: message })
          .eq("id", currentJob);
      }
      toast.error("No pudimos generar la caricatura", { description: message });
    } finally {
      window.clearInterval(timer);
      setBusy(false);
    }
  }

  function discard() {
    resetResult();
    toast.info("Resultado descartado: podés cambiar el estilo y volver a generar.");
  }

  function download() {
    if (!finalUrl) return;
    const link = document.createElement("a");
    link.href = finalUrl;
    link.download = `caricatura-ftg-${jobId ?? "cliente"}.jpg`;
    link.click();
  }

  function addToCart() {
    if (!finalUrl || !jobId) return;
    addMagicItem({
      jobId,
      outputType: "imagen",
      label: `Caricatura grupal · ${selected.length} ${selected.length === 1 ? "persona" : "personas"}`,
      price,
      locationId,
      mediaUrl: finalUrl,
      mediaPath: deliveryPath,
      mediaBucket: BUCKET,
      customerEmail: customerEmail || null,
      customerPhone: customerPhone || null,
    });
    onAddToCart?.({ outputType: "imagen", jobId, price, label: "Caricatura grupal IA" });
    setAdded(true);
    openCartDock();
    toast.success("Caricatura agregada al carrito");
  }

  const result = finalUrl ?? previewUrl;
  const watermarked = !!previewUrl && !finalUrl;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              1 · Rostros detectados
            </h3>
            <Button size="sm" variant="secondary" disabled={!photo || detecting} onClick={() => void runDetection()}>
              {detecting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ScanFace className="mr-1.5 h-4 w-4" />}
              {detectionDone ? "Volver a detectar" : "Detectar personas"}
            </Button>
          </div>

          {!photo && (
            <p className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
              Cargá primero la fotografía del cliente para detectar a todas las personas.
            </p>
          )}

          {photo && (
            <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
              <img src={photo.dataUrl} alt="Fotografía original con los rostros detectados" className="w-full" />
              {faces.map((face) => (
                <button
                  key={face.id}
                  type="button"
                  onClick={() => toggleFace(face.id)}
                  style={{
                    left: `${face.box.x * 100}%`,
                    top: `${face.box.y * 100}%`,
                    width: `${face.box.width * 100}%`,
                    height: `${face.box.height * 100}%`,
                  }}
                  className={cn(
                    "absolute rounded-md border-2 transition-colors",
                    face.selected ? "border-primary bg-primary/10" : "border-muted-foreground/70 bg-background/40",
                  )}
                  title={face.selected ? "Excluir esta persona" : "Incluir esta persona"}
                >
                  <span
                    className={cn(
                      "absolute -top-1 left-0 -translate-y-full rounded px-1 text-[10px] font-semibold",
                      face.selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {face.label}
                  </span>
                </button>
              ))}
            </div>
          )}

          {detectionDone && (
            <p className="text-sm">
              Detectamos <strong>{faces.length}</strong> {faces.length === 1 ? "persona" : "personas"} ·{" "}
              <strong>{selected.length}</strong> {selected.length === 1 ? "incluida" : "incluidas"} en la caricatura.
            </p>
          )}

          {faces.length > 0 && (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {faces.map((face) => (
                <li key={face.id} className="flex items-start gap-2 p-2.5 text-xs">
                  <Checkbox
                    checked={face.selected}
                    onCheckedChange={() => toggleFace(face.id)}
                    className="mt-0.5"
                    aria-label={`Incluir ${face.label}`}
                  />
                  <span className="flex-1">
                    <span className="flex items-center gap-2 font-medium">
                      {face.label}
                      <span className="text-muted-foreground">({face.id})</span>
                      {face.minor && <Badge variant="secondary">Menor</Badge>}
                    </span>
                    <span className="block text-muted-foreground">{face.position}</span>
                    <span className="block text-muted-foreground">{face.description}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">2 · Estilo</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {CARICATURE_STYLES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setStyle(option.value);
                  resetResult();
                }}
                className={cn(
                  "rounded-lg border border-border p-2.5 text-left text-sm transition-colors hover:border-primary",
                  style === option.value && "border-primary bg-primary/5",
                )}
              >
                <span className="block font-medium">{option.label}</span>
                <span className="block text-xs text-muted-foreground">{option.hint}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Fondo</label>
            <Select
              value={background}
              onValueChange={(v) => {
                setBackground(v);
                resetResult();
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CARICATURE_BACKGROUNDS.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              Indicación del vendedor (opcional, no reemplaza las reglas de identidad)
            </label>
            <Textarea
              value={note}
              maxLength={MAX_CARICATURE_NOTE}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej.: sumá globos de colores alrededor del grupo"
              rows={2}
            />
          </div>
        </div>
      </section>

      <aside className="space-y-3">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">3 · Resultado</h3>

        <div className="grid grid-cols-2 gap-2">
          <figure className="space-y-1">
            <figcaption className="text-[11px] text-muted-foreground">Original</figcaption>
            <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
              {photo ? (
                <>
                  <img src={photo.dataUrl} alt="Fotografía original" className="h-full w-full object-cover" />
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute right-1 bottom-1 h-6 w-6"
                    onClick={() => setZoom(photo.dataUrl)}
                    aria-label="Ampliar original"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : null}
            </div>
          </figure>

          <figure className="space-y-1">
            <figcaption className="text-[11px] text-muted-foreground">
              {finalUrl ? "Caricatura final" : "Vista previa"}
            </figcaption>
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
              {result ? (
                <>
                  <img
                    src={result}
                    alt="Caricatura generada"
                    className={cn("h-full w-full object-cover", watermarked && "blur-[1px]")}
                  />
                  {watermarked && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold tracking-[0.3em] text-background/80 mix-blend-overlay">
                      FTG · MUESTRA
                    </span>
                  )}
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute right-1 bottom-1 h-6 w-6"
                    onClick={() => setZoom(result)}
                    aria-label="Ampliar resultado"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : busy ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <p className="px-3 text-center text-[11px] text-muted-foreground">
                  La vista previa se genera con marca de agua.
                </p>
              )}
            </div>
          </figure>
        </div>

        <div className="space-y-1 rounded-lg border border-border p-3 text-xs">
          <p className="flex justify-between">
            <span className="text-muted-foreground">Personas a caricaturizar</span>
            <span className="font-medium">{selected.length}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground">Estilo</span>
            <span className="font-medium">{CARICATURE_STYLES.find((s) => s.value === style)?.label}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground">Costo estimado de generación</span>
            <span className="font-medium">USD {estimatedCost.toFixed(3)}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground">Precio sugerido</span>
            <span className="font-medium">{formatMoney(price, "ARS")}</span>
          </p>
        </div>

        {busy && <Progress value={progress} />}

        {errorMessage && (
          <p className="flex items-start gap-1.5 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {errorMessage}
          </p>
        )}

        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Consentimiento</p>
          <label className="flex items-start gap-2 text-xs">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
            <span>{CARICATURE_CONSENT_TEXT}</span>
          </label>
          {hasMinor && (
            <label className="flex items-start gap-2 text-xs">
              <Checkbox checked={guardian} onCheckedChange={(v) => setGuardian(v === true)} className="mt-0.5" />
              <span>
                Hay menores entre las personas seleccionadas: confirmo que el adulto responsable autorizó la creación
                del recuerdo. Se registra fecha, usuario, sede y dispositivo.
              </span>
            </label>
          )}
        </div>

        <div className="space-y-2">
          {!finalUrl && (
            <Button className="w-full" disabled={!canGenerate} onClick={() => void run("preview")}>
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
              {previewUrl ? "Regenerar vista previa" : "Generar caricatura"}
            </Button>
          )}

          {previewUrl && !finalUrl && (
            <div className="flex gap-2">
              <Button className="flex-1" variant="secondary" onClick={discard}>
                <Trash2 className="mr-1.5 h-4 w-4" /> Descartar
              </Button>
              <Button className="flex-1" disabled={busy} onClick={() => void run("final")}>
                <Check className="mr-1.5 h-4 w-4" /> Aprobar
              </Button>
            </div>
          )}

          {finalUrl && (
            <>
              <div className="space-y-2 rounded-lg border border-border p-3">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Entrega</p>
                <Input
                  placeholder="Email del cliente"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
                <Input
                  placeholder="WhatsApp del cliente"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
              <Button className="w-full" disabled={added} onClick={addToCart}>
                <ShoppingCart className="mr-1.5 h-4 w-4" /> {added ? "Agregada al carrito" : "Agregar al carrito"}
              </Button>
              <div className="flex gap-2">
                <Button className="flex-1" variant="secondary" onClick={download}>
                  <Download className="mr-1.5 h-4 w-4" /> Descargar
                </Button>
                <Button className="flex-1" variant="secondary" onClick={() => void run("final")}>
                  <RefreshCw className="mr-1.5 h-4 w-4" /> Regenerar
                </Button>
              </div>
            </>
          )}
        </div>

        {promptPreview && (
          <details className="rounded-lg border border-border p-2 text-[11px] text-muted-foreground">
            <summary className="cursor-pointer">Instrucción interna enviada a la IA</summary>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap">{promptPreview}</pre>
          </details>
        )}
      </aside>

      <Dialog open={!!zoom} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Vista ampliada</DialogTitle>
          </DialogHeader>
          {zoom && <img src={zoom} alt="Vista ampliada" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
