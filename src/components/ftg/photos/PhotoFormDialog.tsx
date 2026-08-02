import { useState } from "react";
import { Plus } from "lucide-react";

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

export type PhotoDraft = {
  visitor_code: string;
  image_url: string;
  photographer_name: string;
  has_consent: boolean;
  visitor_name: string;
  contact_email: string;
};

const SAMPLES = [
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
  const [draft, setDraft] = useState<PhotoDraft>(() => ({
    visitor_code: generateVisitorCode(),
    image_url: SAMPLES[0],
    photographer_name: "",
    has_consent: true,
    visitor_name: "",
    contact_email: "",
  }));

  const set = <K extends keyof PhotoDraft>(key: K, value: PhotoDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

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
            <Label htmlFor="image">URL de la imagen</Label>
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
            disabled={pending || !draft.visitor_code || !draft.image_url}
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
