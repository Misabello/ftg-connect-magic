import { Camera, ShieldCheck, ShieldAlert, ShoppingCart, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMoney, relativeTime } from "@/lib/ftg/format";
import { PHOTO_STATUS_LABEL, PHOTO_STATUS_TONE, type PhotoStatus } from "@/lib/ftg/photos";

export type PhotoRow = {
  id: string;
  visitor_code: string;
  image_url: string;
  status: PhotoStatus;
  has_consent: boolean;
  photographer_name: string | null;
  captured_at: string;
  retention_until: string | null;
  souvenirs: number;
};

export function PhotoGrid({
  photos,
  selectedId,
  onSelect,
  onCreateSouvenir,
  onAddToCart,
  photoPrice,
  currency,
}: {
  photos: PhotoRow[];
  selectedId: string | null;
  onSelect: (photo: PhotoRow) => void;
  onCreateSouvenir: (photo: PhotoRow) => void;
  onAddToCart?: (photo: PhotoRow) => void;
  photoPrice?: number | null;
  currency?: string;
}) {
  if (photos.length === 0) {
    return (
      <div className="surface-card flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
        <Camera className="h-8 w-8" />
        <p className="text-sm">No hay fotografías para este filtro.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {photos.map((photo) => (
        <article
          key={photo.id}
          onClick={() => onSelect(photo)}
          className={cn(
            "surface-card group cursor-pointer overflow-hidden p-0 transition-shadow",
            selectedId === photo.id && "ring-2 ring-primary",
          )}
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            <img
              src={photo.image_url}
              alt={`Fotografía del visitante ${photo.visitor_code}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span
              className={cn(
                "absolute top-3 left-3 rounded-md px-2 py-0.5 text-[11px] font-medium",
                PHOTO_STATUS_TONE[photo.status],
              )}
            >
              {PHOTO_STATUS_LABEL[photo.status]}
            </span>
            {photo.souvenirs > 0 && (
              <span className="absolute top-3 right-3 flex items-center gap-1 rounded-md bg-background/85 px-2 py-0.5 text-[11px] font-medium">
                <Sparkles className="h-3 w-3" /> {photo.souvenirs}
              </span>
            )}
          </div>
          <div className="space-y-2 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-sm font-semibold">{photo.visitor_code}</p>
              {photo.has_consent ? (
                <span className="flex items-center gap-1 text-[11px] text-success">
                  <ShieldCheck className="h-3.5 w-3.5" /> consentimiento
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-destructive">
                  <ShieldAlert className="h-3.5 w-3.5" /> sin consentimiento
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {photo.photographer_name ?? "Sin fotógrafo"} · {relativeTime(photo.captured_at)}
              {photo.retention_until ? ` · conserva hasta ${photo.retention_until}` : ""}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                size="sm"
                disabled={!photo.has_consent}
                onClick={(event) => {
                  event.stopPropagation();
                  onCreateSouvenir(photo);
                }}
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                {photo.has_consent ? "Crear recuerdo mágico" : "Requiere consentimiento"}
              </Button>
              {onAddToCart && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(event) => {
                    event.stopPropagation();
                    onAddToCart(photo);
                  }}
                >
                  <ShoppingCart className="mr-1.5 h-4 w-4" />
                  {photoPrice ? formatMoney(photoPrice, currency ?? "ARS") : "Al carrito"}
                </Button>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
