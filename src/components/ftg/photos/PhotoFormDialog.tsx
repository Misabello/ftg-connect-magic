import { useRef, useState } from "react";
import { Camera, Cloud, Loader2, Plus, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateVisitorCode } from "@/lib/ftg/photos";
import { supabase } from "@/integrations/supabase/client";

const MAX_UPLOAD_MB = 12;
const SIGNED_URL_TTL = 60 * 60 * 24 * 365; // un año

export type PhotoDraft = {
  visitor_code: string;
  image_url: string;
  photographer_name: string;
  has_consent: boolean;
  visitor_name: string;
  contact_email: string;
};

const SAMPLES: string[] = [
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
  "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=800",
];

export function PhotoFormDialog({
  onSubmit,
  pending,
}: {
  onSubmit: (draft: PhotoDraft) => Promise<void> | void;
  pending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<PhotoDraft>(() => ({
    visitor_code: generateVisitorCode(),
    image_url: SAMPLES[0] ?? "",
    photographer_name: "",
    has_consent: true,
    visitor_name: "",
    contact_email: "",
  }));

  const set = <K extends keyof PhotoDraft>(key: K, value: PhotoDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Formato no permitido", { description: "Subí una imagen JPG, PNG o WEBP." });
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      toast.error("Archivo demasiado grande", { description: `El máximo es ${MAX_UPLOAD_MB} MB.` });
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${draft.visitor_code || "foto"}/${Date.now()}.${ext}`;
      const upload = await supabase.storage.from("visitor-photos").upload(path, file, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });
      if (upload.error) throw new Error(upload.error.message);
      const signed = await supabase.storage.from("visitor-photos").createSignedUrl(path, SIGNED_URL_TTL);
      if (signed.error || !signed.data?.signedUrl) throw new Error(signed.error?.message ?? "Sin URL");
      set("image_url", signed.data.signedUrl);
      toast.success("Fotografía cargada");
    } catch (error) {
      toast.error("No pudimos subir la fotografía", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" /> Cargar fotografía
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cargar fotografía</DialogTitle>
          <DialogDescription>
            Se asocia a la sede activa, con código de visitante y consentimiento explícito.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="visitor">Código de visitante</Label>
              <Input
                id="visitor"
                value={draft.visitor_code}
                onChange={(e) => set("visitor_code", e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="photographer">Fotógrafo</Label>
              <Input
                id="photographer"
                value={draft.photographer_name}
                placeholder="Nombre del fotógrafo"
                onChange={(e) => set("photographer_name", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="image">Imagen</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile(file);
                e.target.value = "";
              }}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile(file);
                e.target.value = "";
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Smartphone className="mr-1.5 h-4 w-4" />
                )}
                Subir desde el dispositivo
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={uploading}
                onClick={() => cameraRef.current?.click()}
              >
                <Camera className="mr-1.5 h-4 w-4" /> Sacar foto ahora
              </Button>
            </div>
            {draft.image_url && (
              <div className="overflow-hidden rounded-lg border border-border">
                <img src={draft.image_url} alt="Fotografía cargada" className="max-h-48 w-full object-contain" />
              </div>
            )}
            <Label htmlFor="image" className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
              <Cloud className="h-3.5 w-3.5" /> o pegá un enlace público de la nube
            </Label>
            <Input id="image" value={draft.image_url} onChange={(e) => set("image_url", e.target.value)} />
            <div className="flex gap-2 pt-1">
              {SAMPLES.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => set("image_url", url)}
                  className="h-12 w-16 overflow-hidden rounded-md border border-border"
                >
                  <img src={url} alt="Muestra de fotografía" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Visitante</Label>
              <Input id="name" value={draft.visitor_name} onChange={(e) => set("visitor_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Contacto</Label>
              <Input
                id="email"
                type="email"
                value={draft.contact_email}
                onChange={(e) => set("contact_email", e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
            <Checkbox
              checked={draft.has_consent}
              onCheckedChange={(v) => set("has_consent", v === true)}
              className="mt-0.5"
            />
            <span>
              El visitante autoriza el uso de su imagen para generar recuerdos. Sin consentimiento no se
              puede procesar con IA.
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            disabled={pending || uploading || !draft.visitor_code || !draft.image_url}
            onClick={async () => {
              await onSubmit(draft);
              setOpen(false);
              setDraft((prev) => ({ ...prev, visitor_code: generateVisitorCode(), visitor_name: "", contact_email: "" }));
            }}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
